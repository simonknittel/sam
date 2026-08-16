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
export const rustfsImage =
  "rustfs/rustfs:1.0.0-rc.2@sha256:7d6d361c49c08d427250fb59aae5d78df83d644c3405d9ccf4b21cda0b0692d0";

export const s3AccessKeyId = "playwright-s3-access-key";
export const s3SecretAccessKey = "playwright-insecure-s3-secret";
export const s3BucketName = "uploads";
export const s3ContainerPort = 9000;

/**
 * Same bucket setup as the compose.yml rustfs-bootstrap service: anonymous
 * reads so uploaded files are public by unguessable URL like on the real
 * bucket, and CORS for the browser's cross-origin presigned PUTs.
 */
export const s3AnonymousReadPolicy = JSON.stringify({
  Version: "2012-10-17",
  Statement: [
    {
      Effect: "Allow",
      Principal: { AWS: ["*"] },
      Action: ["s3:GetObject"],
      Resource: [`arn:aws:s3:::${s3BucketName}/*`],
    },
  ],
});

export const s3CorsConfiguration = {
  CORSRules: [
    {
      AllowedOrigins: ["*"],
      AllowedMethods: ["GET", "PUT", "HEAD"],
      AllowedHeaders: ["*"],
      ExposeHeaders: ["ETag"],
      MaxAgeSeconds: 3600,
    },
  ],
};

/**
 * S3 environment of the app — all runtime-read server variables, so the
 * RustFS container's random host port only needs to be known when a
 * worker's `next start` launches (the app build merely needs the variables
 * present for its env validation).
 */
export const s3Environment = (s3Port: number) =>
  ({
    S3_ENDPOINT: `http://localhost:${s3Port}`,
    S3_ACCESS_KEY_ID: s3AccessKeyId,
    S3_SECRET_ACCESS_KEY: s3SecretAccessKey,
    S3_BUCKET_NAME: s3BucketName,
    S3_PUBLIC_URL: `http://localhost:${s3Port}/${s3BucketName}`,
  }) as const;

/** Same pinned image as compose.yml (feature flag server). */
export const unleashImage =
  "unleashorg/unleash-server:8.1.0@sha256:16f3ffb914880e7d0f23629a0c1b77aebea3aa619b0305f76eb50b3fb75998a9";

export const unleashContainerPort = 4242;
/** Lives next to the app databases in the stack's Postgres container. */
export const unleashDatabase = "unleash";
/** Reads the flags of the default project's development environment. */
export const unleashBackendToken =
  "default:development.playwright-insecure-backend-token";
/** Used by tests to create and toggle flags (see fixtures/unleash.ts). */
export const unleashAdminToken = "*:*.playwright-insecure-admin-token";

/**
 * Unleash environment of the app — runtime-read server variables like
 * s3Environment. All workers share one Unleash container, so tests must
 * only toggle flags no other test depends on.
 */
export const unleashEnvironment = (unleashPort: number) =>
  ({
    UNLEASH_SERVER_API_URL: `http://localhost:${unleashPort}/api`,
    UNLEASH_SERVER_API_TOKEN: unleashBackendToken,
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
  /** Host port of the RustFS S3 endpoint (see s3Environment) */
  readonly s3Port: number;
  /** Host port of the Unleash server (see unleashEnvironment) */
  readonly unleashPort: number;
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
 * gracefully at runtime; tests must not depend on them. S3 and Unleash are
 * real though — uploads go to the stack's RustFS container (see
 * s3Environment) and feature flags come from the stack's Unleash container
 * (see unleashEnvironment).
 *
 * The Care Bear Shooter build URL is a NEXT_PUBLIC_ variable, so it must be
 * present at build time for the flag-released page to render at all; the
 * Unity build behind it never loads in tests.
 */
export const appDummyEnvironment = {
  DISCORD_CLIENT_ID: "playwright-dummy",
  DISCORD_CLIENT_SECRET: "playwright-dummy",
  DISCORD_GUILD_ID: "playwright-dummy",
  DISCORD_TOKEN: "playwright-dummy",
  NEXT_PUBLIC_ALGOLIA_APP_ID: "playwright-dummy",
  ALGOLIA_ADMIN_API_KEY: "playwright-dummy",
  NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY: "playwright-dummy",
  NEXT_PUBLIC_CARE_BEAR_SHOOTER_BUILD_URL:
    "http://localhost:9/playwright-dummy-care-bear-shooter",
  NEXTAUTH_SECRET: "playwright-insecure-auth-secret",
} as const;
