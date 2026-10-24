import type { Tracer } from "@opentelemetry/api";
import type { PrismaClientType } from "@sam-monorepo/database";
import type {
  AuditEventInput,
  GuildScheduledEventChange,
  GuildScheduledEventContent,
  GuildScheduledEventTarget,
} from "@sam-monorepo/domain";
import type { JWK } from "jose";
import type { KeyObject } from "node:crypto";
import type { ChangelogSource } from "./ports/changelog.js";
import type { EmailRequester } from "./ports/email.js";
import type { ImageReader } from "./ports/images.js";
import type { FileStorage } from "./ports/storage.js";

export * from "./ports/changelog.js";
export * from "./ports/email.js";
export * from "./ports/images.js";
export * from "./ports/storage.js";

export interface Notification {
  readonly type: string;
  readonly payload: unknown;
}

export type LogArguments = Record<string, unknown>;

/** Never put tokens, secrets or personal data into a log record */
export interface Logger {
  readonly info: (message: string, args?: LogArguments) => void;
  readonly warn: (message: string, args?: LogArguments) => void;
  readonly error: (message: string, args?: LogArguments) => void;
}

export interface WikiPageContentReplacement {
  readonly pageId: string;
  /** Tiptap JSON that agrees with the schema of the editor */
  readonly content: object;
  /** The citizen that the collab server records as the last editor */
  readonly updatedByEntityId: string | null;
}

/** One editor connection to one wiki page */
export interface WikiCollabSession {
  /**
   * The user: the collab server writes its audit events for this user (the
   * subject of the token)
   */
  readonly userId: string;
  readonly pageId: string;
  /** The citizen that the collab server records as the editor */
  readonly entityId: string | null;
  /** False gives a read-only connection */
  readonly canEdit: boolean;
}

/**
 * The realtime server (Pusher Channels or Soketi) that sends the on-site
 * notifications to the open tabs. Each tab signs in with the id of its user.
 */
export interface RealtimeServer {
  /**
   * Closes all connections that signed in with the user. Throws when the
   * server refuses the request.
   */
  readonly terminateUserConnections: (userId: string) => Promise<void>;
}

/** The key that signs the access tokens. Its public key is in the JWKS. */
export interface SigningKey {
  readonly privateKey: KeyObject;
  readonly publicJwk: JWK;
  /** The `kid` of the tokens and of the JWKS */
  readonly keyId: string;
  readonly algorithm: "ES256";
}

export enum DiscordOutcome {
  Success = "SUCCESS",
  /** Only for "Unknown Guild Scheduled Event" (the error code 10070) */
  NotFound = "NOT_FOUND",
  Failed = "FAILED",
}

export type DiscordResult<Data> =
  | { readonly outcome: DiscordOutcome.Success; readonly data: Data }
  | { readonly outcome: DiscordOutcome.NotFound }
  | { readonly outcome: DiscordOutcome.Failed };

/** A guild scheduled event as the sync reads it. Absent values are null. */
export interface DiscordScheduledEvent {
  readonly id: string;
  readonly guildId: string;
  readonly name: string;
  readonly description: string | null;
  readonly image: string | null;
  readonly startTime: Date;
  readonly endTime: Date | null;
  readonly creatorId: string | null;
  readonly location: string | null;
}

/** A channel of the guild. `type` is the channel type of Discord. */
export interface DiscordGuildChannel {
  readonly id: string;
  readonly name: string;
  readonly type: number;
  readonly position: number | null;
}

/** The bot of the guild. Never throws: every failure is a DiscordResult. */
export interface DiscordGateway {
  readonly listScheduledEvents: () => Promise<
    DiscordResult<DiscordScheduledEvent[]>
  >;
  /**
   * All pages, or Failed. Never a partial list: the sync cancels each user
   * that is not in it.
   */
  readonly listScheduledEventUserIds: (
    scheduledEventId: string,
  ) => Promise<DiscordResult<string[]>>;
  readonly listChannels: () => Promise<DiscordResult<DiscordGuildChannel[]>>;
  readonly createScheduledEvent: (
    content: GuildScheduledEventContent,
    target: GuildScheduledEventTarget,
  ) => Promise<DiscordResult<{ readonly id: string }>>;
  readonly modifyScheduledEvent: (
    scheduledEventId: string,
    change: GuildScheduledEventChange,
  ) => Promise<DiscordResult<null>>;
  readonly deleteScheduledEvent: (
    scheduledEventId: string,
  ) => Promise<DiscordResult<null>>;
}

/**
 * The services that the use cases get from the app that runs them. Each app
 * builds its contexts in its composition root.
 */
export interface ApplicationContext {
  readonly prisma: PrismaClientType;
  /**
   * The implementation never throws: it logs a failed write, because the
   * mutation that the events describe has happened.
   */
  readonly audit: {
    readonly create: (events: AuditEventInput[]) => Promise<void>;
  };
  readonly notifications: {
    readonly trigger: (notifications: Notification[]) => Promise<void>;
  };
  readonly email: EmailRequester;
  readonly log: Logger;
  readonly tracer: Tracer;
  readonly now: () => Date;
  /** Null when the host has no changelog entries (the Lambda functions) */
  readonly changelog: ChangelogSource | null;
  /**
   * The collab server of the wiki editor. Null when the collab server is not
   * configured: then the wiki content is read-only and the app does not
   * offer the editor.
   */
  readonly collab: {
    /**
     * Replaces the content of a wiki page through the collab server, thus
     * the open editors get the new content
     */
    readonly replaceContent: (
      replacement: WikiPageContentReplacement,
    ) => Promise<void>;
    /**
     * A short-lived token for one editor connection, signed with the secret
     * that the host shares with the collab server
     */
    readonly createSessionToken: (
      session: WikiCollabSession,
    ) => Promise<string>;
    /**
     * Closes all editor connections of the user. Throws when the collab
     * server refuses the request or cannot be reached.
     */
    readonly disconnectUser: (userId: string) => Promise<void>;
  } | null;
  /**
   * Null when the host has no client of the realtime server (the Lambda
   * functions, or an app without the configuration of Pusher)
   */
  readonly realtime: RealtimeServer | null;
  /**
   * Null when the host has no bot token. Then a use case behaves as if
   * Discord cannot be reached.
   */
  readonly discord: DiscordGateway | null;
  /**
   * Null when the host has no access to the bucket of the uploads. Then a
   * use case that must copy, presign or list throws a `ConflictError`
   * (`UploadErrorMessage.StorageNotConfigured`), and the background steps
   * (the image probe, the nightly sweep, the object delete of
   * `deleteUpload`) skip with a warning.
   */
  readonly storage: FileStorage | null;
  /** Null when the host cannot decode images (the Lambda functions) */
  readonly images: ImageReader | null;
  readonly urls: {
    readonly baseUrl: URL;
    /** The base URL without the trailing slash */
    readonly issuer: string;
    /** The canonical URL of the MCP endpoint, the audience of the tokens */
    readonly mcpResourceUrl: URL;
    readonly publicUploadBaseUrl: string;
  };
  /**
   * Gives null when no key is configured. The key loads on the first call,
   * thus an incorrect key stops only the use cases that sign or verify
   * tokens.
   */
  readonly signingKey: () => Promise<SigningKey | null>;
  /** Permits client ids with plain HTTP on a loopback host (tests only) */
  readonly allowInsecureLoopbackClientIds: boolean;
}

interface ApplicationUrlsOptions {
  /** The base URL of the app */
  readonly baseUrl: string | URL;
  /** The public base URL of the uploads bucket */
  readonly publicUploadBaseUrl: string;
}

/** Each host derives the URLs of its context with this function */
export const createApplicationUrls = ({
  baseUrl: baseUrlValue,
  publicUploadBaseUrl,
}: ApplicationUrlsOptions): ApplicationContext["urls"] => {
  const baseUrl = new URL(baseUrlValue);

  return {
    baseUrl,
    issuer: baseUrl.href.replace(/\/$/, ""),
    mcpResourceUrl: new URL("/api/mcp", baseUrl),
    publicUploadBaseUrl: publicUploadBaseUrl.replace(/\/+$/, ""),
  };
};

/**
 * The public URL of an upload in the uploads bucket. The app has the same
 * URL in `getPublicUploadUrl()` of its common module.
 */
export const getPublicUploadUrl = (
  urls: Pick<ApplicationContext["urls"], "publicUploadBaseUrl">,
  uploadId: string,
) =>
  new URL(
    encodeURIComponent(uploadId),
    `${urls.publicUploadBaseUrl}/`,
  ).toString();
