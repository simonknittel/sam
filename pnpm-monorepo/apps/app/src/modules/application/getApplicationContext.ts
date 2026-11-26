import "server-only";

import { env } from "@/env";
import { listChangelogEntriesAsMarkdown } from "@/modules/changelog/utils/listChangelogEntriesAsMarkdown";
import { listTrackedChangelogEntries } from "@/modules/changelog/utils/listTrackedChangelogEntries";
import { getPublicUploadBaseUrl } from "@/modules/common/utils/getPublicUploadUrl";
import { EMBED_TOKEN_ALGORITHM } from "@/modules/embed-authentication/utils/constants";
import { getEmbedSigningKey } from "@/modules/embed-authentication/utils/getEmbedSigningKey";
import { emitEvents } from "@/modules/eventbridge/utils";
import { log } from "@/modules/logging";
import { channelsClient } from "@/modules/pusher/utils/channelsClient";
import { getTracer } from "@/modules/tracing/utils/getTracer";
import {
  createApplicationUrls,
  type ApplicationContext,
} from "@sam-monorepo/application";
import { prisma } from "@sam-monorepo/database";
import {
  createClientMetadataFetcher,
  createCollabClient,
  createDiscordGateway,
  createEventBridgeEmailRequester,
  createEventBridgeNotificationTrigger,
  createPrismaAuditWriter,
  createPusherRealtimeServer,
  createRelayClient,
  createS3Client,
  createS3Storage,
  type S3ClientOptions,
} from "@sam-monorepo/infrastructure";
import { after } from "next/server";
import { isRemoteControlProgramTurnedOff } from "./isRemoteControlProgramTurnedOff";
import { sharpImageReader } from "./sharpImageReader";

/**
 * `S3_ENDPOINT` is for example the local RustFS container, `S3_ACCOUNT_ID` is
 * an account of Cloudflare R2.
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

/**
 * A static route handler that needs only the URLs uses this function, thus the
 * build does not make the other ports.
 */
export const getApplicationUrls = (): ApplicationContext["urls"] =>
  createApplicationUrls({
    baseUrl: env.NEXT_PUBLIC_BASE_URL,
    publicUploadBaseUrl: getPublicUploadBaseUrl(),
  });

/**
 * The embed tokens, the access tokens, the connection tokens of the Remote
 * Control Program and the requests to the relay service use the same key
 */
const getSigningKey: ApplicationContext["signingKey"] = async () => {
  const signingKey = await getEmbedSigningKey();
  if (!signingKey) return null;

  return { ...signingKey, algorithm: EMBED_TOKEN_ALGORITHM };
};

// The emitter has its own span, thus the two ports need no span of their own
const createApplicationContext = (): ApplicationContext => ({
  prisma,
  // The response does not wait for the audit events and the notifications
  audit: createPrismaAuditWriter({ prisma, log, defer: after }),
  notifications: createEventBridgeNotificationTrigger({
    emitEvents,
    source: "App",
    log,
    defer: after,
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
    ? createPusherRealtimeServer({ client: channelsClient })
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
  urls: getApplicationUrls(),
  signingKey: getSigningKey,
  clientMetadata: createClientMetadataFetcher(),
  allowInsecureLoopbackClientIds:
    env.OAUTH_ALLOW_INSECURE_LOOPBACK_CLIENT_IDS === "1",
  isRemoteControlProgramTurnedOff,
  relay: env.RELAY_URL
    ? createRelayClient({
        url: env.RELAY_URL,
        signingKey: getSigningKey,
        issuer: getApplicationUrls().issuer,
        // A ban runs in an interactive request, thus a hanging relay service
        // must not hold the request open for long
        requestTimeoutMilliseconds: 5_000,
      })
    : null,
  // The app verifies the connection tokens with its own signing key
  connectionTokenVerificationKey: null,
});

/**
 * The environment does not change while the process runs, thus the contexts
 * are built one time. The key of `signingKey` loads on its first call.
 */
let context: ApplicationContext | undefined;
let mcpContext: ApplicationContext | undefined;

export const getApplicationContext = () =>
  (context ??= createApplicationContext());

/**
 * Only for the MCP endpoint. The OAuth endpoints and the consent page use
 * `getApplicationContext()`. The context has the live Discord gateway: the MCP
 * tools do not write to Discord only because they give no app-only option.
 */
export const getMcpApplicationContext = () =>
  (mcpContext ??= {
    ...getApplicationContext(),
    audit: createPrismaAuditWriter({
      prisma,
      log,
      triggeredViaMcp: true,
      defer: after,
    }),
  });
