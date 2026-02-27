import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /*
   * Serverside Environment variables, not available on the client.
   * Will throw if you access these variables on the client.
   */
  server: {
    DATABASE_URL: z
      .url()
      .default("postgresql://postgres:admin@localhost:5432/db"),
    NODE_ENV: z.enum(["development", "test", "production"]),
    NEXTAUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string().min(1)
        : z.string().min(1).optional(),
    NEXTAUTH_URL: z
      .preprocess(
        // Uses VERCEL_URL if NEXTAUTH_URL is not set, e.g. on Vercel's preview deployments
        (str) => str || `https://${process.env.VERCEL_URL}`,
        z.url(),
      )
      .default("http://localhost:3000"),
    DISCORD_CLIENT_ID: z.string(),
    DISCORD_CLIENT_SECRET: z.string(),
    DISCORD_GUILD_ID: z.string(),
    DISCORD_TOKEN: z.string(),
    ALGOLIA_ADMIN_API_KEY: z.string(),
    S3_ACCOUNT_ID: z.string(),
    S3_ACCESS_KEY_ID: z.string(),
    S3_SECRET_ACCESS_KEY: z.string(),
    S3_BUCKET_NAME: z.string(),
    UNLEASH_SERVER_API_URL: z.url(),
    UNLEASH_SERVER_API_TOKEN: z.string(),
    BASE_URL: z.preprocess(
      // Uses VERCEL_URL if BASE_URL is not set, e.g. on Vercel's preview deployments
      (str) => {
        if (str) {
          return str;
        } else if (process.env.VERCEL_URL) {
          return `https://${process.env.VERCEL_URL}`;
        }

        return "http://localhost:3000";
      },
      z.string().url(),
    ),
    HOST: z.preprocess(
      // Uses VERCEL_URL if HOST and BASE_URL are not set, e.g. on Vercel's preview deployments
      (str) => {
        if (str) {
          return str;
        } else if (process.env.BASE_URL) {
          return process.env.BASE_URL.replace(/https?:\/\//, "");
        } else if (process.env.VERCEL_URL) {
          return process.env.VERCEL_URL;
        }

        return "localhost:3000";
      },
      z.string(),
    ),
    COMMIT_SHA: z.preprocess(
      // Uses VERCEL_GIT_COMMIT_SHA if COMMIT_SHA is not set
      (str) => str || process.env.VERCEL_GIT_COMMIT_SHA,
      z.string().optional(),
    ),
    AWS_ACCESS_KEY_ID: z.string().optional(),
    AWS_SECRET_ACCESS_KEY: z.string().optional(),
    AWS_EVENT_BUS_ARN: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),
    ENABLE_INSTRUMENTATION: z.string().optional(),
    OTEL_EXPORTER_OTLP_PROTOCOL: z.string().optional(),
    OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
    PUSHER_CHANNELS_APP_SECRET: z.string().optional(),
  },

  /*
   * Environment variables available on the client (and server).
   *
   * 💡 You'll get type errors if these are not prefixed with NEXT_PUBLIC_.
   */
  client: {
    NEXT_PUBLIC_ALGOLIA_APP_ID: z.string(),
    NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY: z.string(),
    NEXT_PUBLIC_S3_PUBLIC_URL: z.string(),
    NEXT_PUBLIC_CARE_BEAR_SHOOTER_BUILD_URL: z.url().optional(),
    NEXT_PUBLIC_DOWNLOADS_BASE_URL: z.url().optional(),
    NEXT_PUBLIC_DOWNLOADS_BASE_URL_2: z.url().optional(),
    NEXT_PUBLIC_PUSHER_CHANNELS_APP_ID: z.string().optional(),
    NEXT_PUBLIC_PUSHER_CHANNELS_APP_KEY: z.string().optional(),
    NEXT_PUBLIC_PUSHER_CHANNELS_HOST: z.string().optional(),
    NEXT_PUBLIC_PUSHER_CHANNELS_PORT: z.coerce.number().optional(),
    NEXT_PUBLIC_PUSHER_CHANNELS_SECURE_PORT: z.coerce.number().optional(),
    NEXT_PUBLIC_VAPID_KEY: z.string().optional(),
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
    NEXT_PUBLIC_ALGOLIA_APP_ID: process.env.NEXT_PUBLIC_ALGOLIA_APP_ID,
    ALGOLIA_ADMIN_API_KEY: process.env.ALGOLIA_ADMIN_API_KEY,
    NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY:
      process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY,
    S3_ACCOUNT_ID: process.env.S3_ACCOUNT_ID,
    S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
    S3_BUCKET_NAME: process.env.S3_BUCKET_NAME,
    NEXT_PUBLIC_S3_PUBLIC_URL: process.env.NEXT_PUBLIC_S3_PUBLIC_URL,
    UNLEASH_SERVER_API_URL: process.env.UNLEASH_SERVER_API_URL,
    UNLEASH_SERVER_API_TOKEN: process.env.UNLEASH_SERVER_API_TOKEN,
    HOST: process.env.HOST,
    COMMIT_SHA: process.env.COMMIT_SHA,
    NEXT_PUBLIC_CARE_BEAR_SHOOTER_BUILD_URL:
      process.env.NEXT_PUBLIC_CARE_BEAR_SHOOTER_BUILD_URL,
    BASE_URL: process.env.BASE_URL,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_EVENT_BUS_ARN: process.env.AWS_EVENT_BUS_ARN,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
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
    NEXT_PUBLIC_PUSHER_CHANNELS_HOST:
      process.env.NEXT_PUBLIC_PUSHER_CHANNELS_HOST,
    NEXT_PUBLIC_PUSHER_CHANNELS_PORT:
      process.env.NEXT_PUBLIC_PUSHER_CHANNELS_PORT,
    NEXT_PUBLIC_PUSHER_CHANNELS_SECURE_PORT:
      process.env.NEXT_PUBLIC_PUSHER_CHANNELS_SECURE_PORT,
    NEXT_PUBLIC_VAPID_KEY: process.env.NEXT_PUBLIC_VAPID_KEY,
  },

  emptyStringAsUndefined: true,

  skipValidation: process.env.SKIP_VALIDATION === "1",
});
