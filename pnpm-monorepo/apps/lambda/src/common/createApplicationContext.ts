import { trace } from "@opentelemetry/api";
import {
  createApplicationUrls,
  type ApplicationContext,
  type FileStorage,
} from "@sam-monorepo/application";
import { prisma } from "@sam-monorepo/database";
import {
  createEventBridgeClient,
  createEventBridgeEmailRequester,
  createEventBridgeEmitter,
  createEventBridgeNotificationTrigger,
  createPrismaAuditWriter,
} from "@sam-monorepo/infrastructure";
import { log } from "./logger";

/**
 * The no-op tracer of OpenTelemetry, because the functions register no
 * provider. X-Ray stays at the level of the handlers and the jobs, thus the
 * spans of the use cases are lost in the Lambda functions.
 */
export const tracer = trace.getTracer("sam");

interface ApplicationContextOptions {
  /**
   * The `Source` of the notification and email events: the name of the
   * function
   */
  readonly source: string;
  /** The base URL of the app */
  readonly baseUrl: string;
  /** The public base URL of the uploads bucket */
  readonly publicUploadBaseUrl: string;
  /** Only the functions with a bot token give the gateway */
  readonly discord?: ApplicationContext["discord"];
  /** Only the functions with access to the bucket give the storage */
  readonly storage?: FileStorage | null;
}

/**
 * The composition root of the Lambda functions. Each function builds its
 * context after its setup. The functions cannot decode images (`images` is
 * null): `sharp` stays out of the bundles.
 */
export const createApplicationContext = ({
  source,
  baseUrl,
  publicUploadBaseUrl,
  discord = null,
  storage = null,
}: ApplicationContextOptions): ApplicationContext => {
  const emitEvents = createEventBridgeEmitter({
    client: createEventBridgeClient(),
    eventBusArn: process.env.AWS_EVENT_BUS_ARN,
    log,
  });

  return {
    prisma,
    audit: createPrismaAuditWriter({ prisma, log }),
    notifications: createEventBridgeNotificationTrigger({ emitEvents, source }),
    email: createEventBridgeEmailRequester({ emitEvents, source }),
    log,
    tracer,
    now: () => new Date(),
    changelog: null,
    collab: null,
    realtime: null,
    discord,
    storage,
    images: null,
    urls: createApplicationUrls({ baseUrl, publicUploadBaseUrl }),
    signingKey: async () => null,
    allowInsecureLoopbackClientIds: false,
  };
};
