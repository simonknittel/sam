import type { Tracer } from "@opentelemetry/api";
import type { PrismaClientType } from "@sam-monorepo/database";
import type {
  AuditEventInput,
  CitizenRealtimeChannel,
  GuildScheduledEventChange,
  GuildScheduledEventContent,
  GuildScheduledEventTarget,
  RemoteControlProgramSwitches,
} from "@sam-monorepo/domain";
import type { JWK, JWTVerifyGetKey } from "jose";
import type { KeyObject } from "node:crypto";
import type { ChangelogSource } from "./ports/changelog.js";
import type { ClientMetadataFetcher } from "./ports/clientMetadata.js";
import type { EmailRequester } from "./ports/email.js";
import type { ImageReader } from "./ports/images.js";
import type { FileStorage } from "./ports/storage.js";

export * from "./ports/changelog.js";
export * from "./ports/clientMetadata.js";
export * from "./ports/email.js";
export * from "./ports/images.js";
export * from "./ports/storage.js";

/**
 * The compiler does not check the type and the payload: they must agree with
 * `bodySchema` of the notification router. Else the event goes to the
 * dead-letter queue, and nobody gets the notification. An id in the payload
 * needs `z.cuid()` or `z.cuid2()` there, like `@default(cuid())` or
 * `@default(cuid(2))` of its model.
 */
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
  readonly canEdit: boolean;
}

/** One event for a private realtime channel of a citizen */
export interface CitizenRealtimeEvent {
  /**
   * The event goes to this private channel of the citizen
   * (`getCitizenRealtimeChannelName()` of the domain): the on-site
   * notifications, or the data of the Remote Control Program
   */
  readonly channel: CitizenRealtimeChannel;
  readonly citizenId: string;
  /** The name of the event that the subscriber listens to */
  readonly name: string;
  /**
   * The implementation sends it as JSON. The JSON must stay below the size
   * limit of the server for one event.
   */
  readonly data: unknown;
}

/**
 * The realtime server (Pusher Channels or Soketi) that sends the on-site
 * notifications and the data of the Remote Control Program to the open
 * tabs. Each tab signs in with the id of its user.
 */
export interface RealtimeServer {
  /**
   * Closes all connections that signed in with the user. Throws when the
   * server refuses the request.
   */
  readonly terminateUserConnections: (userId: string) => Promise<void>;
  /**
   * Sends the events to the private channels of the citizens, each event to
   * its `channel`. It sends all events, also after a failure. Then it throws
   * when the server refused an event or could not be reached.
   */
  readonly publishToCitizens: (
    events: readonly CitizenRealtimeEvent[],
  ) => Promise<void>;
}

/**
 * The internal endpoints of the relay service of the Remote Control Program
 * (`apps/relay`). Each request carries a short-lived token that the
 * implementation signs with the signing key of the app, thus the app and
 * the relay service share no secret.
 */
export interface RelayService {
  /** The public WebSocket URL of the relay service. The runtimes connect to it. */
  readonly webSocketUrl: URL;
  /**
   * Closes all runtime connections of the user. Throws when the relay
   * service refuses the request or cannot be reached.
   */
  readonly disconnectUser: (userId: string) => Promise<void>;
}

/**
 * The algorithm of the signing key. A verification of a token of the app
 * accepts only this algorithm.
 */
export const SIGNING_KEY_ALGORITHM = "ES256";

/** The key that signs the access tokens. Its public key is in the JWKS. */
export interface SigningKey {
  readonly privateKey: KeyObject;
  readonly publicJwk: JWK;
  /** The `kid` of the tokens and of the JWKS */
  readonly keyId: string;
  readonly algorithm: typeof SIGNING_KEY_ALGORITHM;
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

/** `type` is the channel type of Discord */
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
   * functions, or an app without the configuration of Pusher). Then `banUser`
   * does not close the connections.
   */
  readonly realtime: RealtimeServer | null;
  /**
   * Null when the host has no bot token. Then a use case behaves as if Discord
   * cannot be reached.
   */
  readonly discord: DiscordGateway | null;
  /**
   * Null when the host has no access to the bucket of the uploads. Then a copy,
   * a presigned URL and a list throw a `ConflictError`, and the background
   * steps skip with a warning.
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
  /**
   * Null when the host does not run the OAuth authorization server (the
   * Lambda functions). Then only the clients whose cached document is not
   * expired are accepted.
   */
  readonly clientMetadata: ClientMetadataFetcher | null;
  /**
   * The switches of the organization for the Remote Control Program (the
   * Unleash flags of `RemoteControlProgramUnleashFlag`). A host without
   * Unleash gives all parts on: `ALL_REMOTE_CONTROL_PROGRAM_PARTS_ON` of the
   * domain.
   */
  readonly remoteControlProgramSwitches: () => Promise<RemoteControlProgramSwitches>;
  /**
   * Null when the host has no relay service (no URL of the relay service, or
   * the relay service itself). Then the browser runtime works only on the
   * machine, and the use cases skip the calls of the relay service.
   */
  readonly relay: RelayService | null;
  /**
   * The keys that verify the connection tokens of the Remote Control Program
   * in a host without the private key: the relay service gives the JSON Web
   * Key Set of the app (`createRemoteJWKSet()` of `jose`). Null: the use
   * cases verify with the public key of `signingKey`.
   */
  readonly connectionTokenVerificationKey: JWTVerifyGetKey | null;
  /** Permits client ids with plain HTTP on a loopback host (tests only) */
  readonly allowInsecureLoopbackClientIds: boolean;
}

interface ApplicationUrlsOptions {
  readonly baseUrl: string | URL;
  readonly publicUploadBaseUrl: string;
}

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

/** The app has the same URL in `getPublicUploadUrl()` of its common module */
export const getPublicUploadUrl = (
  urls: Pick<ApplicationContext["urls"], "publicUploadBaseUrl">,
  uploadId: string,
) =>
  new URL(
    encodeURIComponent(uploadId),
    `${urls.publicUploadBaseUrl}/`,
  ).toString();
