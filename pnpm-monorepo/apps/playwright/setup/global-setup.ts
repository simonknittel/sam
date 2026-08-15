import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { promisify } from "node:util";
import {
  GenericContainer,
  Network,
  Wait,
  type StartedTestContainer,
} from "testcontainers";
import { getFreePort, runCommand } from "./processes";
import {
  appDirectory,
  appDummyEnvironment,
  collabImageTag,
  monorepoRoot,
  postgresImage,
  postgresNetworkAlias,
  postgresPassword,
  postgresUser,
  readStackState,
  s3BucketName,
  s3ContainerPort,
  s3Environment,
  seaweedfsImage,
  seaweedfsS3Config,
  stateDirectory,
  stateFilePath,
  templateDatabase,
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

/**
 * The host port must be identical to the one inlined into the app build
 * (see s3Environment), so on skipped builds the previous run's port is
 * reused instead of picking a fresh free one.
 */
const resolveS3Port = (skipBuild: boolean) => {
  if (!skipBuild) return getFreePort();
  try {
    return readStackState().s3Port;
  } catch {
    throw new Error(
      "PLAYWRIGHT_SKIP_BUILD=1 but no stack state from a previous run exists — run once without the flag",
    );
  }
};

const BUCKET_CREATE_ATTEMPTS = 5;

/**
 * Buckets are not auto-created on the first PUT — same one-shot creation as
 * the seaweedfs-create-bucket service of the dev stack (compose.yml).
 */
const createUploadsBucket = async (seaweedfs: StartedTestContainer) => {
  for (let attempt = 1; ; attempt++) {
    const result = await seaweedfs.exec([
      "/bin/sh",
      "-c",
      `echo "s3.bucket.create -name ${s3BucketName}" | weed shell -master=localhost:9333`,
    ]);
    if (result.exitCode === 0 && result.output.includes("created bucket"))
      return;
    if (attempt === BUCKET_CREATE_ATTEMPTS)
      throw new Error(`Creating the uploads bucket failed: ${result.output}`);
    await sleep(500 * attempt);
  }
};

const globalSetup = async () => {
  const skipBuild = process.env.PLAYWRIGHT_SKIP_BUILD === "1";
  const s3Port = await resolveS3Port(skipBuild);

  console.log("[stack] Starting SeaweedFS…");
  const seaweedfs = await new GenericContainer(seaweedfsImage)
    .withCommand([
      "server",
      "-dir=/data",
      // Bind to all interfaces — the default binds to the container IP
      // only, which breaks the localhost health request and weed shell
      "-ip.bind=0.0.0.0",
      "-s3",
      "-s3.config=/etc/seaweedfs/s3.json",
    ])
    .withCopyContentToContainer([
      { content: seaweedfsS3Config, target: "/etc/seaweedfs/s3.json" },
    ])
    .withExposedPorts({ container: s3ContainerPort, host: s3Port })
    .withWaitStrategy(Wait.forHttp("/healthz", s3ContainerPort))
    .start();
  await createUploadsBucket(seaweedfs);

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

  await Promise.all(builds);

  const state: StackState = {
    postgresHost: postgres.getHost(),
    postgresPort: postgres.getMappedPort(5432),
    networkName: network.getName(),
    s3Port,
  };
  mkdirSync(stateDirectory, { recursive: true });
  writeFileSync(stateFilePath, JSON.stringify(state, null, 2));

  console.log("[stack] Ready");

  return async () => {
    await postgres.stop();
    await seaweedfs.stop();
    await network.stop();
  };
};

export default globalSetup;
