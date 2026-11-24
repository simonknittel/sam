import { env } from "./scrape-discord-events/setup"; // must be first

import { syncDiscordEvents } from "@sam-monorepo/application";
import { createDiscordGateway } from "@sam-monorepo/infrastructure";
import type { ScheduledHandler } from "aws-lambda";
import {
  createApplicationContext,
  tracer,
} from "./common/createApplicationContext";
import { createJobFactory } from "./common/createJob";
import { log } from "./common/logger";
import { runJobsInIsolation } from "./common/runJobsInIsolation";

const context = createApplicationContext({
  source: "scrape-discord-events",
  baseUrl: env.BASE_URL,
  publicUploadBaseUrl: env.PUBLIC_UPLOAD_BASE_URL,
  discord: createDiscordGateway({
    apiBaseUrl: env.DISCORD_API_BASE_URL,
    botToken: env.DISCORD_BOT_TOKEN,
    guildId: env.DISCORD_GUILD_ID,
    // Shorter than in the app: one run sends many requests in its 180 seconds
    requestTimeoutMilliseconds: 5_000,
    // The wait limit protects the timeout of the function (180 seconds)
    rateLimitRetry: { maximumRetryCount: 4, maximumWaitSeconds: 30 },
    log,
    tracer,
  }),
});

const createJob = createJobFactory(context);

export const handler: ScheduledHandler = async () =>
  runJobsInIsolation({ syncDiscordEvents: createJob(syncDiscordEvents) });
