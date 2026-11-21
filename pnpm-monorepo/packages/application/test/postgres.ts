import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import type { TestProject } from "vitest/node";

/**
 * Same pinned image, command line and environment as the psql service of
 * compose.yml and the Playwright stack: PostgreSQL with TimescaleDB (see
 * compose.yml).
 */
const POSTGRES_IMAGE =
  "timescale/timescaledb:2.32.1-pg18@sha256:70e6526ad8e31e3f4833f2c5863b50b92d7a6bee4d432ad1f660e2c6dd956d94";

const POSTGRES_COMMAND = [
  "postgres",
  "-c",
  "shared_preload_libraries=timescaledb",
  "-c",
  "timescaledb.telemetry_level=off",
];

const POSTGRES_ENVIRONMENT = { NO_TS_TUNE: "true" } as const;

const monorepoRoot = fileURLToPath(new URL("../../..", import.meta.url));

declare module "vitest" {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

const applyMigrations = async (databaseUrl: string) => {
  const child = spawn(
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
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: "inherit",
    },
  );

  const [code] = await once(child, "exit");
  if (code !== 0)
    throw new Error(`prisma migrate deploy exited with code ${code}`);
};

/**
 * Starts one PostgreSQL container for the integration tests and applies all
 * migrations to it.
 */
export default async function setup(project: TestProject) {
  const container = await new PostgreSqlContainer(POSTGRES_IMAGE)
    .withCommand(POSTGRES_COMMAND)
    .withEnvironment(POSTGRES_ENVIRONMENT)
    .start();
  const databaseUrl = container.getConnectionUri();

  await applyMigrations(databaseUrl);
  project.provide("databaseUrl", databaseUrl);

  return async () => {
    await container.stop();
  };
}
