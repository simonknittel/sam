import { createEnv } from "@t3-oss/env-nextjs";
import * as z from "zod/mini";

const LOOPBACK_HOSTNAMES: readonly string[] = ["localhost", "127.0.0.1", "::1"];

/** For endpoints that the app sends credentials to */
const isEncryptedOrLoopbackUrl = (value: string) => {
  const { protocol, hostname } = new URL(value);
  return (
    protocol === "https:" ||
    LOOPBACK_HOSTNAMES.includes(hostname.replace(/^\[|\]$/g, ""))
  );
};

const isOriginUrl = (value: string) => {
  const { username, password, pathname, search, hash } = new URL(value);
  return !username && !password && pathname === "/" && !search && !hash;
};

export const env = createEnv({
  server: {
    DATABASE_URL: z._default(
      z.url(),
      "postgresql://postgres:admin@localhost:5432/db",
    ),
    NODE_ENV: z.enum(["development", "test", "production"]),
    NEXTAUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string().check(z.minLength(1))
        : z.optional(z.string().check(z.minLength(1))),
    NEXTAUTH_URL: z._default(
      z.pipe(
        z.transform((str) => str || `https://${process.env.VERCEL_URL}`),
        z.url(),
      ),
      "http://localhost:3000",
    ),
    DISCORD_CLIENT_ID: z.string(),
    DISCORD_CLIENT_SECRET: z.string(),
    DISCORD_GUILD_ID: z.string(),
    /**
     * Publishing events to Discord needs specific guild permissions of the bot
     * (see docs/setup-local-machine.md). No OAuth2 scope lets a user token
     * manage guild scheduled events, so this always acts as the bot.
     */
    DISCORD_TOKEN: z.string(),
    /**
     * Without a trailing slash. Only overridden by the Playwright stack, which
     * points it at a dead port so creating an organization never leaves the
     * machine.
     */
    RSI_BASE_URL: z._default(z.url(), "https://robertsspaceindustries.com"),
    /**
     * Without a trailing slash. Only overridden by the Playwright stack (mock
     * server). Plain HTTP is refused unless it points at the local machine:
     * every request carries the bot token.
     */
    DISCORD_API_BASE_URL: z._default(
      z
        .url()
        .check(
          z.refine(
            isEncryptedOrLoopbackUrl,
            "must use https unless it is loopback",
          ),
        ),
      "https://discord.com/api/v10",
    ),
    /** Cloudflare R2, only when S3_ENDPOINT is unset */
    S3_ACCOUNT_ID: z.optional(z.string()),
    /**
     * Explicit endpoint of any S3-compatible provider (e.g. the local
     * RustFS container from compose.yml). Requests use path-style
     * addressing when set. Takes precedence over S3_ACCOUNT_ID.
     */
    S3_ENDPOINT: z.optional(z.url()),
    S3_ACCESS_KEY_ID: z.string(),
    S3_SECRET_ACCESS_KEY: z.string(),
    S3_BUCKET_NAME: z.string(),
    UNLEASH_SERVER_API_URL: z.optional(z.url()),
    UNLEASH_SERVER_API_TOKEN: z.optional(z.string()),
    /**
     * Only overridden by the Playwright stack, to pick up a toggled flag
     * without waiting out the production window.
     */
    UNLEASH_REVALIDATE_SECONDS: z._default(
      z.coerce.number().check(z.int(), z.positive()),
      30,
    ),
    COMMIT_SHA: z.pipe(
      z.transform((str) => str || process.env.VERCEL_GIT_COMMIT_SHA),
      z.optional(z.string()),
    ),
    /** AWS_PROFILE=sam-test terraform output access_key_app_vercel */
    AWS_ACCESS_KEY_ID: z.optional(z.string()),
    /** AWS_PROFILE=sam-test terraform output secret_access_key_app_vercel */
    AWS_SECRET_ACCESS_KEY: z.optional(z.string()),
    /** AWS_PROFILE=sam-test terraform output event_bus_arn */
    AWS_EVENT_BUS_ARN: z.optional(z.string()),
    OPENAI_BASE_URL: z.optional(z.url()),
    OPENAI_API_KEY: z.optional(z.string()),
    OPENAI_EXTRA_API_KEY: z.optional(z.string()),
    ENABLE_INSTRUMENTATION: z.optional(z.string()),
    /**
     * The spans and the log records go as protobuf over HTTP (see
     * instrumentation.node.ts). The SDK reads this variable for the logs.
     */
    OTEL_EXPORTER_OTLP_PROTOCOL: z.optional(z.literal("http/protobuf")),
    OTEL_EXPORTER_OTLP_ENDPOINT: z.optional(z.string()),
    /** Pusher Channels (or any other Pusher Channels-compatible provider like Soketi) */
    PUSHER_CHANNELS_APP_SECRET: z._default(z.string(), "app-secret"),
    /**
     * Public base of the uploads bucket: either a bare host (e.g. an R2
     * public bucket domain — https is implied and the upload id is the sole
     * path segment) or a full base URL incl. scheme, port and bucket path
     * for providers without per-bucket domains (e.g. the local RustFS
     * container, http://localhost:9000/uploads). Server-only on purpose:
     * the client reads it at runtime from an attribute the root layout
     * renders (see getPublicUploadUrl.ts), and a runtime variable — unlike
     * a build-inlined NEXT_PUBLIC_ one — lets several instances of one
     * build serve uploads from different buckets (used by the Playwright
     * test stack).
     */
    S3_PUBLIC_URL: z.string(),
    /**
     * Shared secret with the wiki collab server (apps/collab). The wiki is
     * read-only if unset.
     */
    COLLAB_JWT_SECRET: z.optional(z.string()),
    /**
     * WebSocket URL of the wiki collab server (apps/collab). The wiki is
     * read-only if unset. Server-only for the reason of S3_PUBLIC_URL.
     */
    COLLAB_URL: z.optional(z.url({ protocol: /^wss?$/ })),
    /**
     * WebSocket URL of the relay service of the Remote Control Program
     * (apps/relay), for example wss://sam-relay.example.com. The internal
     * endpoint of the relay service (the disconnect after a ban) is on the
     * same host. If unset, the browser runtime works only on the machine. The
     * relay service verifies the tokens of the app with
     * /.well-known/jwks.json (see
     * docs/setup-local-machine.md#embedded-app-authentication for the key).
     * Server-only on purpose: the browser runtime receives the URL with its
     * connection token, and a runtime variable lets several instances of
     * one build talk to different relay services (used by the Playwright
     * test stack).
     */
    RELAY_URL: z.optional(z.url({ protocol: /^wss?$/ })),
    /**
     * Base64-encoded PKCS#8 PEM of an ES256 (P-256) private key. It signs the
     * embed tokens and the MCP access tokens, and both are disabled if unset.
     * For the generation and the reason for one key per environment, see
     * docs/setup-local-machine.md.
     */
    EMBED_JWT_PRIVATE_KEY: z.optional(z.string()),
    /**
     * Origin of the Grafana of /app/statistics (see
     * docs/setup-local-machine.md). The page shows a note if unset.
     *
     * The frame URL carries the token, thus plain HTTP is refused unless it
     * points at the local machine. A path is refused, because the page replaces
     * it with the path of the dashboard. User information is refused, because
     * each viewer would see it in the frame URL.
     */
    STATISTICS_GRAFANA_URL: z.optional(
      z
        .url({ protocol: /^https?$/ })
        .check(
          z.refine(
            isEncryptedOrLoopbackUrl,
            "must use https unless it is loopback",
          ),
          z.refine(
            isOriginUrl,
            "must be an origin, without a path, a query, a fragment or user information",
          ),
        ),
    ),
    /**
     * Only for the Playwright stack. Never set it in a deployment: it weakens
     * the SSRF protection of the document fetch (see docs/mcp-server.md).
     */
    OAUTH_ALLOW_INSECURE_LOOPBACK_CLIENT_IDS: z.optional(z.enum(["1"])),
  },

  client: {
    NEXT_PUBLIC_CARE_BEAR_SHOOTER_BUILD_URL: z.optional(z.url()),
    NEXT_PUBLIC_DOWNLOADS_BASE_URL: z.optional(z.url()),
    NEXT_PUBLIC_DOWNLOADS_BASE_URL_2: z.optional(z.url()),
    NEXT_PUBLIC_PUSHER_CHANNELS_APP_ID: z._default(z.string(), "app-id"),
    NEXT_PUBLIC_PUSHER_CHANNELS_APP_KEY: z._default(z.string(), "app-key"),
    NEXT_PUBLIC_PUSHER_CHANNELS_HOST: z._default(z.string(), "localhost"),
    NEXT_PUBLIC_PUSHER_CHANNELS_PORT: z._default(z.coerce.number(), 6001),
    NEXT_PUBLIC_PUSHER_CHANNELS_SECURE_PORT: z.optional(z.coerce.number()),
    /** npx web-push generate-vapid-keys */
    NEXT_PUBLIC_VAPID_KEY: z.optional(z.string()),
    NEXT_PUBLIC_PLAUSIBLE_ENDPOINT: z.optional(z.url()),
    /**
     * Number of the production release (Git tag `release-<number>`). The
     * Release workflow sets it at build time. Not set in all other builds.
     */
    NEXT_PUBLIC_RELEASE_NUMBER: z.optional(
      z.coerce.number().check(z.int(), z.positive()),
    ),
    NEXT_PUBLIC_HOST: z.pipe(
      z.transform((str) => {
        if (str) {
          return str;
        } else if (process.env.NEXT_PUBLIC_BASE_URL) {
          return process.env.NEXT_PUBLIC_BASE_URL.replace(/https?:\/\//, "");
        } else if (process.env.VERCEL_URL) {
          return process.env.VERCEL_URL;
        }

        return "localhost:3000";
      }),
      z.string(),
    ),
    NEXT_PUBLIC_BASE_URL: z.pipe(
      z.transform((str) => {
        if (str) {
          return str;
        } else if (process.env.VERCEL_URL) {
          return `https://${process.env.VERCEL_URL}`;
        }

        return "http://localhost:3000";
      }),
      z.url(),
    ),
  },

  experimental__runtimeEnv: {
    NEXT_PUBLIC_CARE_BEAR_SHOOTER_BUILD_URL:
      process.env.NEXT_PUBLIC_CARE_BEAR_SHOOTER_BUILD_URL,
    NEXT_PUBLIC_DOWNLOADS_BASE_URL: process.env.NEXT_PUBLIC_DOWNLOADS_BASE_URL,
    NEXT_PUBLIC_DOWNLOADS_BASE_URL_2:
      process.env.NEXT_PUBLIC_DOWNLOADS_BASE_URL_2,
    NEXT_PUBLIC_PUSHER_CHANNELS_APP_ID:
      process.env.NEXT_PUBLIC_PUSHER_CHANNELS_APP_ID,
    NEXT_PUBLIC_PUSHER_CHANNELS_APP_KEY:
      process.env.NEXT_PUBLIC_PUSHER_CHANNELS_APP_KEY,
    NEXT_PUBLIC_PUSHER_CHANNELS_HOST:
      process.env.NEXT_PUBLIC_PUSHER_CHANNELS_HOST,
    NEXT_PUBLIC_PUSHER_CHANNELS_PORT:
      process.env.NEXT_PUBLIC_PUSHER_CHANNELS_PORT,
    NEXT_PUBLIC_PUSHER_CHANNELS_SECURE_PORT:
      process.env.NEXT_PUBLIC_PUSHER_CHANNELS_SECURE_PORT,
    NEXT_PUBLIC_VAPID_KEY: process.env.NEXT_PUBLIC_VAPID_KEY,
    NEXT_PUBLIC_PLAUSIBLE_ENDPOINT: process.env.NEXT_PUBLIC_PLAUSIBLE_ENDPOINT,
    NEXT_PUBLIC_RELEASE_NUMBER: process.env.NEXT_PUBLIC_RELEASE_NUMBER,
    NEXT_PUBLIC_HOST: process.env.NEXT_PUBLIC_HOST,
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
  },

  emptyStringAsUndefined: true,

  skipValidation: process.env.SKIP_VALIDATION === "1",
});
