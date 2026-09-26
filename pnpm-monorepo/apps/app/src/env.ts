import { createEnv } from "@t3-oss/env-nextjs";
import * as z from "zod/mini";

const LOOPBACK_HOSTNAMES: readonly string[] = ["localhost", "127.0.0.1", "::1"];

/**
 * Whether a URL either encrypts its traffic or never leaves the machine.
 * Used for endpoints the app sends credentials to.
 */
const isEncryptedOrLoopbackUrl = (value: string) => {
  const { protocol, hostname } = new URL(value);
  return (
    protocol === "https:" ||
    LOOPBACK_HOSTNAMES.includes(hostname.replace(/^\[|\]$/g, ""))
  );
};

export const env = createEnv({
  /*
   * Serverside Environment variables, not available on the client.
   * Will throw if you access these variables on the client.
   */
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
        // Uses VERCEL_URL if NEXTAUTH_URL is not set, e.g. on Vercel's preview deployments
        z.transform((str) => str || `https://${process.env.VERCEL_URL}`),
        z.url(),
      ),
      "http://localhost:3000",
    ),
    DISCORD_CLIENT_ID: z.string(),
    DISCORD_CLIENT_SECRET: z.string(),
    DISCORD_GUILD_ID: z.string(),
    /**
     * Bot token of the app's Discord bot, sent as `Authorization: Bot …`.
     * Publishing events to Discord needs the bot to hold CREATE_EVENTS and
     * MANAGE_EVENTS in the guild — no OAuth2 scope lets a user token manage
     * guild scheduled events, so this always acts as the bot.
     */
    DISCORD_TOKEN: z.string(),
    /**
     * Base URL of the Discord REST API, without a trailing slash. Only
     * overridden by the Playwright stack, which points the app at its own
     * mock server instead of talking to Discord. Plain HTTP is refused
     * unless it points at the local machine: every request carries the bot
     * token, and a misconfigured host would ship it in cleartext.
     */
    /**
     * Base URL of the Star Citizen website the organization logos are
     * scraped from, without a trailing slash. Only overridden by the
     * Playwright stack, which points it at a dead port so creating an
     * organization never leaves the machine.
     */
    RSI_BASE_URL: z._default(z.url(), "https://robertsspaceindustries.com"),
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
    /**
     * Cloudflare R2 account id, used to derive the bucket endpoint when
     * S3_ENDPOINT is unset
     */
    S3_ACCOUNT_ID: z.optional(z.string()),
    /**
     * Explicit endpoint of any S3-compatible provider (e.g. the local
     * RustFS container from compose.yml). Requests use path-style
     * addressing when set. Takes precedence over S3_ACCOUNT_ID.
     */
    S3_ENDPOINT: z.optional(z.url()),
    /** Amazon S3 (or any other S3-compatible provider like Cloudflare R2) */
    S3_ACCESS_KEY_ID: z.string(),
    /** Amazon S3 (or any other S3-compatible provider like Cloudflare R2) */
    S3_SECRET_ACCESS_KEY: z.string(),
    /** Amazon S3 (or any other S3-compatible provider like Cloudflare R2) */
    S3_BUCKET_NAME: z.string(),
    /** Unleash (or any other Unleash-compatible feature flag provider like GitLab) */
    UNLEASH_SERVER_API_URL: z.optional(z.url()),
    /** Unleash (or any other Unleash-compatible feature flag provider like GitLab) */
    UNLEASH_SERVER_API_TOKEN: z.optional(z.string()),
    /**
     * Seconds the fetched flag definitions are cached for. Lets the
     * Playwright stack pick up a toggled flag without waiting out the
     * production window.
     */
    UNLEASH_REVALIDATE_SECONDS: z._default(
      z.coerce.number().check(z.int(), z.positive()),
      30,
    ),
    COMMIT_SHA: z.pipe(
      // Uses VERCEL_GIT_COMMIT_SHA if COMMIT_SHA is not set
      z.transform((str) => str || process.env.VERCEL_GIT_COMMIT_SHA),
      z.optional(z.string()),
    ),
    /** AWS_PROFILE=sam-test terraform output access_key_app_vercel */
    AWS_ACCESS_KEY_ID: z.optional(z.string()),
    /** AWS_PROFILE=sam-test terraform output secret_key_app_vercel */
    AWS_SECRET_ACCESS_KEY: z.optional(z.string()),
    /** AWS_PROFILE=sam-test terraform output event_bus_arn */
    AWS_EVENT_BUS_ARN: z.optional(z.string()),
    OPENAI_BASE_URL: z.optional(z.url()),
    OPENAI_API_KEY: z.optional(z.string()),
    OPENAI_EXTRA_API_KEY: z.optional(z.string()),
    ENABLE_INSTRUMENTATION: z.optional(z.string()),
    OTEL_EXPORTER_OTLP_PROTOCOL: z.optional(z.string()),
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
     * Shared secret with the wiki collab server (apps/collab). Realtime
     * collaboration is disabled if unset.
     */
    COLLAB_JWT_SECRET: z.optional(z.string()),
    /**
     * WebSocket URL of the wiki collab server (apps/collab), e.g.
     * wss://sam-collab.example.com. Realtime collaboration is disabled if
     * unset. Server-only on purpose: the client receives the URL as a prop,
     * and a runtime variable — unlike a build-inlined NEXT_PUBLIC_ one —
     * lets several instances of one build talk to different collab servers
     * (used by the Playwright test stack).
     */
    COLLAB_URL: z.optional(z.url({ protocol: /^wss?$/ })),
    /**
     * Base64-encoded PKCS#8 PEM of the ES256 (P-256) private key the app
     * signs the identity tokens of authenticated iframe embeds with (see
     * docs/embedded-app-authentication.md). Embed authentication is
     * disabled if unset: no token is appended to an embed URL and
     * /.well-known/jwks.json publishes an empty key set. Every environment
     * needs its own key, otherwise a token minted by a preview deployment
     * verifies as a production one. Generate one with:
     * `openssl ecparam -name prime256v1 -genkey -noout | openssl pkcs8 -topk8 -nocrypt | base64 -w0`
     */
    EMBED_JWT_PRIVATE_KEY: z.optional(z.string()),
  },

  /*
   * Environment variables available on the client (and server).
   *
   * 💡 You'll get type errors if these are not prefixed with NEXT_PUBLIC_.
   */
  client: {
    NEXT_PUBLIC_CARE_BEAR_SHOOTER_BUILD_URL: z.optional(z.url()),
    NEXT_PUBLIC_DOWNLOADS_BASE_URL: z.optional(z.url()),
    NEXT_PUBLIC_DOWNLOADS_BASE_URL_2: z.optional(z.url()),
    /** Pusher Channels (or any other Pusher Channels-compatible provider like Soketi) */
    NEXT_PUBLIC_PUSHER_CHANNELS_APP_ID: z._default(z.string(), "app-id"),
    /** Pusher Channels (or any other Pusher Channels-compatible provider like Soketi) */
    NEXT_PUBLIC_PUSHER_CHANNELS_APP_KEY: z._default(z.string(), "app-key"),
    /** Pusher Channels (or any other Pusher Channels-compatible provider like Soketi) */
    NEXT_PUBLIC_PUSHER_CHANNELS_HOST: z._default(z.string(), "localhost"),
    /** Pusher Channels (or any other Pusher Channels-compatible provider like Soketi) */
    NEXT_PUBLIC_PUSHER_CHANNELS_PORT: z._default(z.coerce.number(), 6001),
    /** Pusher Channels (or any other Pusher Channels-compatible provider like Soketi) */
    NEXT_PUBLIC_PUSHER_CHANNELS_SECURE_PORT: z.optional(z.coerce.number()),
    /** npx web-push generate-vapid-keys */
    NEXT_PUBLIC_VAPID_KEY: z.optional(z.string()),
    NEXT_PUBLIC_PLAUSIBLE_ENDPOINT: z.optional(z.url()),
    NEXT_PUBLIC_HOST: z.pipe(
      // Uses VERCEL_URL if HOST and BASE_URL are not set, e.g. on Vercel's preview deployments
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
      // Uses VERCEL_URL if BASE_URL is not set, e.g. on Vercel's preview deployments
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

  /*
   * Due to how Next.js bundles environment variables on Edge and Client,
   * we need to manually destructure them to make sure all are included in bundle.
   *
   * 💡 You'll get type errors if not all variables from `server` & `client` are included here.
   */
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
    DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET,
    DISCORD_GUILD_ID: process.env.DISCORD_GUILD_ID,
    DISCORD_TOKEN: process.env.DISCORD_TOKEN,
    RSI_BASE_URL: process.env.RSI_BASE_URL,
    DISCORD_API_BASE_URL: process.env.DISCORD_API_BASE_URL,
    S3_ACCOUNT_ID: process.env.S3_ACCOUNT_ID,
    S3_ENDPOINT: process.env.S3_ENDPOINT,
    S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
    S3_BUCKET_NAME: process.env.S3_BUCKET_NAME,
    S3_PUBLIC_URL: process.env.S3_PUBLIC_URL,
    UNLEASH_SERVER_API_URL: process.env.UNLEASH_SERVER_API_URL,
    UNLEASH_SERVER_API_TOKEN: process.env.UNLEASH_SERVER_API_TOKEN,
    UNLEASH_REVALIDATE_SECONDS: process.env.UNLEASH_REVALIDATE_SECONDS,
    NEXT_PUBLIC_HOST: process.env.NEXT_PUBLIC_HOST,
    COMMIT_SHA: process.env.COMMIT_SHA,
    NEXT_PUBLIC_CARE_BEAR_SHOOTER_BUILD_URL:
      process.env.NEXT_PUBLIC_CARE_BEAR_SHOOTER_BUILD_URL,
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_EVENT_BUS_ARN: process.env.AWS_EVENT_BUS_ARN,
    OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_EXTRA_API_KEY: process.env.OPENAI_EXTRA_API_KEY,
    ENABLE_INSTRUMENTATION: process.env.ENABLE_INSTRUMENTATION,
    OTEL_EXPORTER_OTLP_PROTOCOL: process.env.OTEL_EXPORTER_OTLP_PROTOCOL,
    OTEL_EXPORTER_OTLP_ENDPOINT: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    NEXT_PUBLIC_DOWNLOADS_BASE_URL: process.env.NEXT_PUBLIC_DOWNLOADS_BASE_URL,
    NEXT_PUBLIC_DOWNLOADS_BASE_URL_2:
      process.env.NEXT_PUBLIC_DOWNLOADS_BASE_URL_2,
    NEXT_PUBLIC_PUSHER_CHANNELS_APP_ID:
      process.env.NEXT_PUBLIC_PUSHER_CHANNELS_APP_ID,
    NEXT_PUBLIC_PUSHER_CHANNELS_APP_KEY:
      process.env.NEXT_PUBLIC_PUSHER_CHANNELS_APP_KEY,
    PUSHER_CHANNELS_APP_SECRET: process.env.PUSHER_CHANNELS_APP_SECRET,
    COLLAB_JWT_SECRET: process.env.COLLAB_JWT_SECRET,
    COLLAB_URL: process.env.COLLAB_URL,
    EMBED_JWT_PRIVATE_KEY: process.env.EMBED_JWT_PRIVATE_KEY,
    NEXT_PUBLIC_PUSHER_CHANNELS_HOST:
      process.env.NEXT_PUBLIC_PUSHER_CHANNELS_HOST,
    NEXT_PUBLIC_PUSHER_CHANNELS_PORT:
      process.env.NEXT_PUBLIC_PUSHER_CHANNELS_PORT,
    NEXT_PUBLIC_PUSHER_CHANNELS_SECURE_PORT:
      process.env.NEXT_PUBLIC_PUSHER_CHANNELS_SECURE_PORT,
    NEXT_PUBLIC_VAPID_KEY: process.env.NEXT_PUBLIC_VAPID_KEY,
    NEXT_PUBLIC_PLAUSIBLE_ENDPOINT: process.env.NEXT_PUBLIC_PLAUSIBLE_ENDPOINT,
  },

  emptyStringAsUndefined: true,

  skipValidation: process.env.SKIP_VALIDATION === "1",
});
