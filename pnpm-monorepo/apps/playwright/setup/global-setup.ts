import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { Network } from "testcontainers";
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

const buildApp = (templateDatabaseUrl: string) =>
  runCommand("pnpm", ["--filter", "@sam-monorepo/app", "run", "build"], {
    cwd: monorepoRoot,
    env: {
      ...appDummyEnvironment,
      DATABASE_URL: templateDatabaseUrl,
    },
    label: "app build",
  });

const globalSetup = async () => {
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

  const skipBuild = process.env.PLAYWRIGHT_SKIP_BUILD === "1";
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
    builds.push(buildApp(templateDatabaseUrl), buildCollabImage());
  }

  await Promise.all(builds);

  const state: StackState = {
    postgresHost: postgres.getHost(),
    postgresPort: postgres.getMappedPort(5432),
    networkName: network.getName(),
  };
  mkdirSync(stateDirectory, { recursive: true });
  writeFileSync(stateFilePath, JSON.stringify(state, null, 2));

  console.log("[stack] Ready");

  return async () => {
    await postgres.stop();
    await network.stop();
  };
};

export default globalSetup;
