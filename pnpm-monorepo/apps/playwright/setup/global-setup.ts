import {
  CreateBucketCommand,
  PutBucketCorsCommand,
  PutBucketPolicyCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { promisify } from "node:util";
import { GenericContainer, Network, Wait } from "testcontainers";
import { runCommand } from "./processes";
import {
  appDirectory,
  appDummyEnvironment,
  collabImageTag,
  monorepoRoot,
  postgresImage,
  postgresNetworkAlias,
  postgresPassword,
  postgresUser,
  rustfsImage,
  s3AccessKeyId,
  s3AnonymousReadPolicy,
  s3BucketName,
  s3ContainerPort,
  s3CorsConfiguration,
  s3Environment,
  s3SecretAccessKey,
  stateDirectory,
  stateFilePath,
  templateDatabase,
  unleashAdminToken,
  unleashBackendToken,
  unleashContainerPort,
  unleashDatabase,
  unleashImage,
  type StackState,
} from "./stack";

const execFileAsync = promisify(execFile);

const collabImageExists = async () => {
  try {
    await execFileAsync("docker", ["image", "inspect", collabImageTag]);
    return true;
  } catch {
    return false;
  }
};

/**
 * `docker build` (instead of testcontainers' image build) so the BuildKit
 * layer cache is shared with `docker compose build sam-collab` of the dev
 * stack.
 */
const buildCollabImage = () =>
  runCommand(
    "docker",
    [
      "build",
      "--file",
      path.join("apps", "collab", "Dockerfile"),
      "--tag",
      collabImageTag,
      ".",
    ],
    { cwd: monorepoRoot, label: "collab image build" },
  );

const buildApp = (templateDatabaseUrl: string, s3Port: number) =>
  runCommand("pnpm", ["--filter", "@sam-monorepo/app", "run", "build"], {
    cwd: monorepoRoot,
    env: {
      ...appDummyEnvironment,
      ...s3Environment(s3Port),
      DATABASE_URL: templateDatabaseUrl,
    },
    label: "app build",
  });

const BUCKET_BOOTSTRAP_ATTEMPTS = 5;

/**
 * Buckets are not auto-created on the first PUT — same one-shot setup as
 * the rustfs-bootstrap service of the dev stack (compose.yml): create the
 * bucket, allow anonymous reads and configure CORS.
 */
const bootstrapUploadsBucket = async (s3Port: number) => {
  const client = new S3Client({
    region: "auto",
    endpoint: `http://localhost:${s3Port}`,
    forcePathStyle: true,
    requestChecksumCalculation: "WHEN_REQUIRED",
    credentials: {
      accessKeyId: s3AccessKeyId,
      secretAccessKey: s3SecretAccessKey,
    },
  });

  try {
    for (let attempt = 1; ; attempt++) {
      try {
        try {
          await client.send(new CreateBucketCommand({ Bucket: s3BucketName }));
        } catch (error) {
          // A previous attempt may have gotten this far already
          if (
            !(error instanceof Error) ||
            error.name !== "BucketAlreadyOwnedByYou"
          )
            throw error;
        }
        await client.send(
          new PutBucketPolicyCommand({
            Bucket: s3BucketName,
            Policy: s3AnonymousReadPolicy,
          }),
        );
        await client.send(
          new PutBucketCorsCommand({
            Bucket: s3BucketName,
            CORSConfiguration: s3CorsConfiguration,
          }),
        );
        return;
      } catch (error) {
        if (attempt === BUCKET_BOOTSTRAP_ATTEMPTS) throw error;
        await sleep(500 * attempt);
      }
    }
  } finally {
    client.destroy();
  }
};

const globalSetup = async () => {
  const skipBuild = process.env.PLAYWRIGHT_SKIP_BUILD === "1";

  console.log("[stack] Starting RustFS…");
  const rustfs = await new GenericContainer(rustfsImage)
    .withEnvironment({
      RUSTFS_ACCESS_KEY: s3AccessKeyId,
      RUSTFS_SECRET_KEY: s3SecretAccessKey,
    })
    .withExposedPorts(s3ContainerPort)
    .withWaitStrategy(Wait.forHttp("/health", s3ContainerPort))
    .start();
  const s3Port = rustfs.getMappedPort(s3ContainerPort);
  await bootstrapUploadsBucket(s3Port);

  const network = await new Network().start();

  console.log("[stack] Starting Postgres…");
  const postgres = await new PostgreSqlContainer(postgresImage)
    .withNetwork(network)
    .withNetworkAliases(postgresNetworkAlias)
    .withUsername(postgresUser)
    .withPassword(postgresPassword)
    .withDatabase(templateDatabase)
    .start();

  const templateDatabaseUrl = postgres.getConnectionUri();

  const createUnleashDatabase = await postgres.exec([
    "psql",
    "--username",
    postgresUser,
    "--dbname",
    templateDatabase,
    "--command",
    `CREATE DATABASE "${unleashDatabase}"`,
  ]);
  if (createUnleashDatabase.exitCode !== 0)
    throw new Error(
      `Creating the Unleash database failed: ${createUnleashDatabase.output}`,
    );

  console.log("[stack] Applying migrations to the template database…");
  await runCommand(
    "pnpm",
    [
      "--filter",
      "@sam-monorepo/database",
      "exec",
      "prisma",
      "migrate",
      "deploy",
    ],
    {
      cwd: monorepoRoot,
      env: { DATABASE_URL: templateDatabaseUrl },
      label: "prisma migrate deploy",
    },
  );

  const builds: Promise<void>[] = [];

  if (skipBuild) {
    if (!existsSync(path.join(appDirectory, ".next", "BUILD_ID")))
      throw new Error(
        "PLAYWRIGHT_SKIP_BUILD=1 but the app has never been built — run once without the flag",
      );
    if (!(await collabImageExists()))
      throw new Error(
        "PLAYWRIGHT_SKIP_BUILD=1 but the collab image does not exist — run once without the flag",
      );
    console.log(
      "[stack] Skipping app and collab builds (PLAYWRIGHT_SKIP_BUILD=1)",
    );
  } else {
    console.log("[stack] Building the app and the collab image…");
    builds.push(buildApp(templateDatabaseUrl, s3Port), buildCollabImage());
  }

  // Its startup migrations take a while, so it starts alongside the builds
  console.log("[stack] Starting Unleash…");
  const unleashStart = new GenericContainer(unleashImage)
    .withNetwork(network)
    .withEnvironment({
      DATABASE_URL: `postgres://${postgresUser}:${postgresPassword}@${postgresNetworkAlias}:5432/${unleashDatabase}`,
      DATABASE_SSL: "false",
      INIT_BACKEND_API_TOKENS: unleashBackendToken,
      INIT_ADMIN_API_TOKENS: unleashAdminToken,
    })
    .withExposedPorts(unleashContainerPort)
    .withWaitStrategy(Wait.forHttp("/health", unleashContainerPort))
    .withStartupTimeout(120_000)
    .start();

  const [unleash] = await Promise.all([unleashStart, ...builds]);

  const state: StackState = {
    postgresHost: postgres.getHost(),
    postgresPort: postgres.getMappedPort(5432),
    networkName: network.getName(),
    s3Port,
    unleashPort: unleash.getMappedPort(unleashContainerPort),
  };
  mkdirSync(stateDirectory, { recursive: true });
  writeFileSync(stateFilePath, JSON.stringify(state, null, 2));

  console.log("[stack] Ready");

  return async () => {
    await unleash.stop();
    await postgres.stop();
    await rustfs.stop();
    await network.stop();
  };
};

export default globalSetup;
