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

export const tracer = trace.getTracer("sam");

interface ApplicationContextOptions {
  /**
   * The `Source` of the notification and email events: the name of the
   * function
   */
  readonly source: string;
  readonly baseUrl: string;
  readonly publicUploadBaseUrl: string;
  readonly discord?: ApplicationContext["discord"];
  readonly storage?: FileStorage | null;
}

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
    notifications: createEventBridgeNotificationTrigger({
      emitEvents,
      source,
      log,
    }),
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
    clientMetadata: null,
    allowInsecureLoopbackClientIds: false,
    // No Unleash in the Lambda functions: all parts are on
    isRemoteControlProgramTurnedOff: async () => false,
    relay: null,
    connectionTokenVerificationKey: null,
  };
};
