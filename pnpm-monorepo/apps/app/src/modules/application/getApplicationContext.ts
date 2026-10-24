import "server-only";

import { env } from "@/env";
import { listChangelogEntriesAsMarkdown } from "@/modules/changelog/utils/listChangelogEntriesAsMarkdown";
import { listTrackedChangelogEntries } from "@/modules/changelog/utils/listTrackedChangelogEntries";
import { getPublicUploadBaseUrl } from "@/modules/common/utils/getPublicUploadUrl";
import { EMBED_TOKEN_ALGORITHM } from "@/modules/embed-authentication/utils/constants";
import { getEmbedSigningKey } from "@/modules/embed-authentication/utils/getEmbedSigningKey";
import { emitEvents } from "@/modules/eventbridge/utils";
import { log } from "@/modules/logging";
import {
  channelsClient,
  createChannelsRealtimeServer,
} from "@/modules/pusher/utils/channelsClient";
import { getTracer } from "@/modules/tracing/utils/getTracer";
import {
  createApplicationUrls,
  type ApplicationContext,
} from "@sam-monorepo/application";
import { prisma } from "@sam-monorepo/database";
import {
  createCollabClient,
  createDiscordGateway,
  createEventBridgeEmailRequester,
  createEventBridgeNotificationTrigger,
  createPrismaAuditWriter,
  createS3Client,
  createS3Storage,
  type S3ClientOptions,
} from "@sam-monorepo/infrastructure";
import { sharpImageReader } from "./sharpImageReader";

/**
 * An explicit S3_ENDPOINT (for example the local RustFS container) takes
 * precedence over the account of Cloudflare R2. Without one of the two, the
 * app has no bucket.
 */
const createStorage = (): ApplicationContext["storage"] => {
  const credentials = {
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  };
  let clientOptions: S3ClientOptions;
  if (env.S3_ENDPOINT !== undefined)
    clientOptions = { endpoint: env.S3_ENDPOINT, credentials };
  else if (env.S3_ACCOUNT_ID)
    clientOptions = { accountId: env.S3_ACCOUNT_ID, credentials };
  else return null;

  return createS3Storage({
    client: createS3Client(clientOptions),
    bucketName: env.S3_BUCKET_NAME,
  });
};

// The emitter has its own span, thus the two ports need no span of their own
const createApplicationContext = (): ApplicationContext => ({
  prisma,
  audit: createPrismaAuditWriter({ prisma, log }),
  notifications: createEventBridgeNotificationTrigger({
    emitEvents,
    source: "App",
  }),
  email: createEventBridgeEmailRequester({ emitEvents, source: "App" }),
  log,
  tracer: getTracer(),
  now: () => new Date(),
  changelog: {
    list: listChangelogEntriesAsMarkdown,
    listTrackedEntries: listTrackedChangelogEntries,
  },
  // The condition of `getWikiCollabUrl()`
  collab:
    env.COLLAB_URL && env.COLLAB_JWT_SECRET
      ? createCollabClient({
          url: env.COLLAB_URL,
          jwtSecret: env.COLLAB_JWT_SECRET,
          // A replace runs in an interactive request, thus a hanging collab
          // server must not hold the request open for long
          replaceTimeoutMilliseconds: 15_000,
        })
      : null,
  realtime: channelsClient
    ? createChannelsRealtimeServer(channelsClient)
    : null,
  discord: createDiscordGateway({
    apiBaseUrl: env.DISCORD_API_BASE_URL,
    botToken: env.DISCORD_TOKEN,
    guildId: env.DISCORD_GUILD_ID,
    userAgent: `DiscordBot (${env.NEXT_PUBLIC_BASE_URL}, ${env.COMMIT_SHA ?? "0.0.0"})`,
    // A publish runs in an interactive request, thus a hanging Discord must
    // not hold the request open for long
    requestTimeoutMilliseconds: 10_000,
    // One short wait is enough for the low volume of a publish. A longer wait
    // is a failure, and the request does not block further.
    rateLimitRetry: { maximumRetryCount: 1, maximumWaitSeconds: 5 },
    log,
    tracer: getTracer(),
  }),
  storage: createStorage(),
  images: sharpImageReader,
  urls: createApplicationUrls({
    baseUrl: env.NEXT_PUBLIC_BASE_URL,
    publicUploadBaseUrl: getPublicUploadBaseUrl(),
  }),
  // The embed tokens and the access tokens use the same key
  signingKey: async () => {
    const signingKey = await getEmbedSigningKey();
    if (!signingKey) return null;

    return { ...signingKey, algorithm: EMBED_TOKEN_ALGORITHM };
  },
  allowInsecureLoopbackClientIds:
    env.OAUTH_ALLOW_INSECURE_LOOPBACK_CLIENT_IDS === "1",
});

/**
 * The environment does not change while the process runs, thus the contexts
 * are built one time. The key of `signingKey` loads on its first call.
 */
let context: ApplicationContext | undefined;
let mcpContext: ApplicationContext | undefined;

/**
 * The only place in the app that knows how the application context is
 * built. Server actions, pages and route handlers get the context from here.
 */
export const getApplicationContext = () =>
  (context ??= createApplicationContext());

/**
 * The context of the MCP endpoint. Its audit writer marks each event as an
 * action through the MCP server. The OAuth endpoints and the consent page use
 * `getApplicationContext()`.
 */
export const getMcpApplicationContext = () =>
  (mcpContext ??= {
    ...getApplicationContext(),
    audit: createPrismaAuditWriter({ prisma, log, triggeredViaMcp: true }),
  });
