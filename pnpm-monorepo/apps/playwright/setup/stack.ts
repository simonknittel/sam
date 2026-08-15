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

/** Same pinned image as compose.yml (S3-compatible upload storage). */
export const seaweedfsImage =
  "chrislusf/seaweedfs:4.41@sha256:43b768cd62b00d132439cda881b93fd1adebf1b315e996e794087743821d771d";

export const s3AccessKeyId = "playwright-s3-access-key";
export const s3SecretAccessKey = "playwright-insecure-s3-secret";
export const s3BucketName = "uploads";
export const s3ContainerPort = 8333;

/**
 * Same identity model as the compose.yml SeaweedFS service: authenticated
 * writes for the app, anonymous reads so uploaded files are public by
 * unguessable URL like on the real bucket.
 */
export const seaweedfsS3Config = JSON.stringify({
  identities: [
    { name: "anonymous", actions: ["Read"] },
    {
      name: "playwright",
      credentials: [{ accessKey: s3AccessKeyId, secretKey: s3SecretAccessKey }],
      actions: ["Admin", "Read", "List", "Tagging", "Write"],
    },
  ],
});

/**
 * S3 environment of the app. NEXT_PUBLIC_S3_PUBLIC_URL is inlined into the
 * client bundle at build time, so the SeaweedFS host port must be known
 * before the app build and stay identical for every worker's `next start`
 * — it is picked in the global setup and persisted in the stack state.
 */
export const s3Environment = (s3Port: number) =>
  ({
    S3_ENDPOINT: `http://localhost:${s3Port}`,
    S3_ACCESS_KEY_ID: s3AccessKeyId,
    S3_SECRET_ACCESS_KEY: s3SecretAccessKey,
    S3_BUCKET_NAME: s3BucketName,
    NEXT_PUBLIC_S3_PUBLIC_URL: `http://localhost:${s3Port}/${s3BucketName}`,
  }) as const;

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
  /** Host port of the SeaweedFS S3 gateway (see s3Environment) */
  readonly s3Port: number;
}

export const readStackState = (): StackState =>
  JSON.parse(readFileSync(stateFilePath, "utf8")) as StackState;

export const hostDatabaseUrl = (state: StackState, database: string) =>
  `postgresql://${postgresUser}:${postgresPassword}@${state.postgresHost}:${state.postgresPort}/${database}`;

export const containerDatabaseUrl = (database: string) =>
  `postgresql://${postgresUser}:${postgresPassword}@${postgresNetworkAlias}:5432/${database}`;

/**
 * The app validates its environment with non-empty strings for services the
 * test stack doesn't provide (Discord OAuth, Algolia). The features degrade
 * gracefully at runtime; tests must not depend on them. S3 is real though —
 * uploads go to the stack's SeaweedFS container (see s3Environment).
 */
export const appDummyEnvironment = {
  DISCORD_CLIENT_ID: "playwright-dummy",
  DISCORD_CLIENT_SECRET: "playwright-dummy",
  DISCORD_GUILD_ID: "playwright-dummy",
  DISCORD_TOKEN: "playwright-dummy",
  NEXT_PUBLIC_ALGOLIA_APP_ID: "playwright-dummy",
  ALGOLIA_ADMIN_API_KEY: "playwright-dummy",
  NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY: "playwright-dummy",
  NEXTAUTH_SECRET: "playwright-insecure-auth-secret",
} as const;
