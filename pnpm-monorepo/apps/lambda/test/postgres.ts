import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import type { TestProject } from "vitest/node";

/** Same pinned image as compose.yml and the Playwright stack */
const POSTGRES_IMAGE =
  "postgres:18.6-alpine3.23@sha256:885cf05d376c7cf27afef02073e6bdac3841252537f16e244fd1c1e6a7c99fb1";

const monorepoRoot = fileURLToPath(new URL("../../..", import.meta.url));

declare module "vitest" {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

const applyMigrations = (databaseUrl: string) =>
  new Promise<void>((resolve, reject) => {
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

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`prisma migrate deploy exited with code ${code}`));
    });
  });

/**
 * Starts one PostgreSQL container for the integration tests and applies all
 * migrations to it.
 */
export default async function setup(project: TestProject) {
  const container = await new PostgreSqlContainer(POSTGRES_IMAGE).start();
  const databaseUrl = container.getConnectionUri();

  await applyMigrations(databaseUrl);
  project.provide("databaseUrl", databaseUrl);

  return async () => {
    await container.stop();
  };
}
