/**
 * The shared implementations of the ports of `@sam-monorepo/application`.
 * Each host composes them in its composition root. See the README.
 */
export {
  createPrismaAuditWriter,
  type PrismaAuditWriterOptions,
} from "./audit/createPrismaAuditWriter.js";
export {
  createCollabClient,
  type CollabClientOptions,
} from "./collab/createCollabClient.js";
export {
  createDiscordGateway,
  type DiscordGatewayOptions,
} from "./discord/createDiscordGateway.js";
export {
  createEventBridgeEmailRequester,
  type EventBridgeEmailRequesterOptions,
} from "./email/createEventBridgeEmailRequester.js";
export {
  createEventBridgeClient,
  type EventBridgeClientOptions,
} from "./eventbridge/createEventBridgeClient.js";
export {
  EventBridgeFailedEntriesError,
  createEventBridgeEmitter,
  type EmitEvents,
  type EventBridgeEmitterOptions,
  type EventBridgeEntry,
} from "./eventbridge/createEventBridgeEmitter.js";
export {
  createEventBridgeNotificationTrigger,
  type EventBridgeNotificationTriggerOptions,
} from "./notifications/createEventBridgeNotificationTrigger.js";
export { createClientMetadataFetcher } from "./oauth/createClientMetadataFetcher.js";
export {
  createS3Client,
  type S3ClientOptions,
} from "./storage/createS3Client.js";
export {
  createS3Storage,
  type S3StorageOptions,
} from "./storage/createS3Storage.js";
