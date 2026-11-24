import { createHash } from "node:crypto";
import path from "node:path";

export const monorepoRoot = path.resolve(__dirname, "..", "..", "..");
export const appDirectory = path.join(monorepoRoot, "apps", "app");

/**
 * Same pinned image as compose.yml so tests run against the Postgres version
 * the dev stack and production use: PostgreSQL with TimescaleDB.
 */
export const postgresImage =
  "timescale/timescaledb:2.32.1-pg18@sha256:70e6526ad8e31e3f4833f2c5863b50b92d7a6bee4d432ad1f660e2c6dd956d94";

/** The command line of the psql service of compose.yml (see there). */
export const postgresCommand = [
  "postgres",
  "-c",
  "shared_preload_libraries=timescaledb",
  "-c",
  "timescaledb.telemetry_level=off",
];

/** The environment of the psql service of compose.yml (see there). */
export const postgresEnvironment = { NO_TS_TUNE: "true" } as const;

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
 * All of them are runtime-read server variables, so the RustFS container's
 * random host port only needs to be known when a worker's `next start`
 * launches.
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
  "unleashorg/unleash-server:8.3.1@sha256:025cd8b003a70cceb88427ca393c377ca6503a210d95fdee54d21610d51f7ed0";

export const unleashContainerPort = 4242;
export const unleashDatabase = "unleash";
export const unleashBackendToken =
  "default:development.playwright-insecure-backend-token";
export const unleashAdminToken = "*:*.playwright-insecure-admin-token";

/**
 * A flag strategy can match the app of one worker only with this name (see the
 * scopes of fixtures/unleash.ts).
 */
export const unleashAppName = (workerIndex: number) =>
  `sam-playwright-worker-${workerIndex}`;

export const unleashEnvironment = (unleashPort: number, appName: string) =>
  ({
    UNLEASH_SERVER_API_URL: `http://localhost:${unleashPort}/api`,
    UNLEASH_SERVER_API_TOKEN: unleashBackendToken,
    UNLEASH_APP_NAME: appName,
    // Production caches the flag definitions for 30s; a toggle in a test
    // must not wait that out (see tests/unleash.spec.ts).
    UNLEASH_REVALIDATE_SECONDS: "1",
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
export const templateDatabase = "template_sam";
export const postgresNetworkAlias = "psql";

export interface StackState {
  readonly postgresHost: string;
  readonly postgresPort: number;
  readonly networkName: string;
  readonly s3Port: number;
  readonly unleashPort: number;
}

/**
 * Playwright starts the workers after the global setup, with a copy of its
 * environment. Thus the global setup gives the state to the workers in this
 * variable.
 */
const STACK_STATE_VARIABLE = "PLAYWRIGHT_STACK_STATE";

export const writeStackState = (state: StackState) => {
  process.env[STACK_STATE_VARIABLE] = JSON.stringify(state);
};

export const readStackState = (): StackState => {
  const state = process.env[STACK_STATE_VARIABLE];
  if (!state)
    throw new Error(
      `${STACK_STATE_VARIABLE} is not set — the global setup did not run`,
    );
  return JSON.parse(state) as StackState;
};

export const hostDatabaseUrl = (state: StackState, database: string) =>
  `postgresql://${postgresUser}:${postgresPassword}@${state.postgresHost}:${state.postgresPort}/${database}`;

export const containerDatabaseUrl = (database: string) =>
  `postgresql://${postgresUser}:${postgresPassword}@${postgresNetworkAlias}:5432/${database}`;

/**
 * The app validates its environment with non-empty strings for services the
 * test stack doesn't provide (Discord OAuth). Tests must not depend on them.
 * The requests with the bot token go to the Discord mock of the worker.
 *
 * The Care Bear Shooter build URL is a NEXT_PUBLIC_ variable, so it must be
 * present at build time for the flag-released page to render at all; the Unity
 * build behind it never loads in tests.
 *
 * RSI_BASE_URL points the organization logo scrape at a dead port: creating an
 * organization must never reach out to the real website from a test.
 *
 * The AWS variables of a developer's `.env` point at the production event bus,
 * and `next start` loads that file. An empty value here wins over the file
 * (Next never overrides a variable which the process already has), and the app
 * treats an empty value as unset, thus the EventBridge client stays off and no
 * test sends a notification event to production.
 */
export const appDummyEnvironment = {
  /**
   * The zone of the production server (Vercel). Without it, the app takes
   * the zone of the machine, and a bug that reads a time in the server zone
   * shows only in CI.
   */
  TZ: "UTC",
  AWS_ACCESS_KEY_ID: "",
  AWS_SECRET_ACCESS_KEY: "",
  AWS_EVENT_BUS_ARN: "",
  RSI_BASE_URL: "http://localhost:9",
  /**
   * The issuer and the resource of the OAuth server come from this URL, and
   * the build inlines it. Without this value, the build takes the value of
   * the developer `.env`. The workers listen on other ports, but the host
   * check of the MCP endpoint ignores the port.
   */
  NEXT_PUBLIC_BASE_URL: "http://localhost:3000",
  DISCORD_CLIENT_ID: "playwright-dummy",
  DISCORD_CLIENT_SECRET: "playwright-dummy",
  DISCORD_GUILD_ID: "playwright-dummy",
  DISCORD_TOKEN: "playwright-dummy",
  NEXT_PUBLIC_CARE_BEAR_SHOOTER_BUILD_URL:
    "http://localhost:9/playwright-dummy-care-bear-shooter",
  NEXTAUTH_SECRET: "playwright-insecure-auth-secret",
  /**
   * Throwaway ES256 key so the suite exercises the configured path of the
   * embed authentication (see docs/embedded-app-authentication.md) rather
   * than the disabled one. Never used outside this stack.
   */
  EMBED_JWT_PRIVATE_KEY:
    "LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JR0hBZ0VBTUJNR0J5cUdTTTQ5QWdFR0NDcUdTTTQ5QXdFSEJHMHdhd0lCQVFRZzhSVWJ1VHIwcjRJUmdNSi8KQ3FxRlRYMnJWQW41ZDBXbjBCbkpxTXFnMFZTaFJBTkNBQVNwTlpuekQxZXh5NkdDMWVBM2xmYWVSam4vRGNpVAptRkxyVnVWZjJTZ3hHZXdkWkRLS3FWMTVteVJoaWxmT1lXcmNRNEYvKzFaTDFDMU9uUDYrVm9ocAotLS0tLUVORCBQUklWQVRFIEtFWS0tLS0tCg==",
  /**
   * The stack has no Grafana: the tests read only the frame URL and its token
   * (see tests/statistics.spec.ts).
   */
  STATISTICS_GRAFANA_URL: "http://127.0.0.1:9",
  /**
   * The test client of the MCP tests serves its Client ID Metadata Document
   * on the local machine with plain HTTP (see fixtures/cimd-server.ts and
   * docs/mcp-server.md). The same key as above signs the access tokens.
   */
  OAUTH_ALLOW_INSECURE_LOOPBACK_CLIENT_IDS: "1",
} as const;
