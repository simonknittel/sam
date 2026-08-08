import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

export const monorepoRoot = path.resolve(__dirname, "..", "..", "..");
export const appDirectory = path.join(monorepoRoot, "apps", "app");

const stateFilePath = path.join(__dirname, "..", ".stack", "state.json");
export const stateDirectory = path.dirname(stateFilePath);
export { stateFilePath };

/**
 * Same pinned image as compose.yml so tests run against the Postgres version
 * the dev stack and production use.
 */
export const postgresImage =
  "postgres:18.4-alpine3.23@sha256:996d0920e4ff9df1fc19dacb904492f3c1ec0ec1cc338f0ad7123be7731c5f5e";

/**
 * The collab image tag is unique per checkout so parallel worktrees don't
 * overwrite each other's image between building and starting containers.
 */
export const collabImageTag = `sam-collab-playwright:${createHash("sha256")
  .update(monorepoRoot)
  .digest("hex")
  .slice(0, 12)}`;

export const collabJwtSecret = "playwright-insecure-collab-secret";
export const collabPort = 5210;

export const postgresUser = "postgres";
export const postgresPassword = "admin";
/** Runs the migrations once and serves as the template for the worker databases. */
export const templateDatabase = "template_sam";
/** Network alias of the Postgres container, resolvable by the collab containers. */
export const postgresNetworkAlias = "psql";

export interface StackState {
  readonly postgresHost: string;
  readonly postgresPort: number;
  readonly networkName: string;
}

export const readStackState = (): StackState =>
  JSON.parse(readFileSync(stateFilePath, "utf8")) as StackState;

export const hostDatabaseUrl = (state: StackState, database: string) =>
  `postgresql://${postgresUser}:${postgresPassword}@${state.postgresHost}:${state.postgresPort}/${database}`;

export const containerDatabaseUrl = (database: string) =>
  `postgresql://${postgresUser}:${postgresPassword}@${postgresNetworkAlias}:5432/${database}`;

/**
 * The app validates its environment with non-empty strings for services the
 * test stack doesn't provide (Discord OAuth, Algolia, S3). The features
 * degrade gracefully at runtime; tests must not depend on them.
 */
export const appDummyEnvironment = {
  DISCORD_CLIENT_ID: "playwright-dummy",
  DISCORD_CLIENT_SECRET: "playwright-dummy",
  DISCORD_GUILD_ID: "playwright-dummy",
  DISCORD_TOKEN: "playwright-dummy",
  NEXT_PUBLIC_ALGOLIA_APP_ID: "playwright-dummy",
  ALGOLIA_ADMIN_API_KEY: "playwright-dummy",
  NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY: "playwright-dummy",
  S3_ACCOUNT_ID: "playwright-dummy",
  S3_ACCESS_KEY_ID: "playwright-dummy",
  S3_SECRET_ACCESS_KEY: "playwright-dummy",
  S3_BUCKET_NAME: "playwright-dummy",
  NEXT_PUBLIC_S3_PUBLIC_URL: "uploads.playwright.invalid",
  NEXTAUTH_SECRET: "playwright-insecure-auth-secret",
} as const;
