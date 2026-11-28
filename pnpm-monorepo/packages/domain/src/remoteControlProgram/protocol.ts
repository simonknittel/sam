import * as z from "zod";
import {
  LOG_ANALYZER_ENTRY_HASH_PATTERN,
  LogAnalyzerEntryType,
} from "../logAnalyzer/logAnalyzerEntries.js";
import {
  CapabilityId,
  ConnectorId,
  LOG_ENTRIES_CAPABILITY,
  RELAY_LIMITS,
  RuntimeKind,
} from "./catalog.js";
import { gameBuildSchema, gameEnvironmentSchema } from "./logFileHeader.js";

/**
 * The protocol between a runtime and the relay service over one WebSocket
 * connection (see `docs/remote-control-program/README.md#protocol`). Each
 * message is one JSON object in a text frame. The desktop companion (Rust)
 * gets its types from the JSON Schema of these schemas (decision 5).
 *
 * The order of the messages:
 *
 * 1. The runtime sends `hello`. The relay answers with `welcome`, or with
 *    `refusal` and then closes the connection with the code of the reason.
 * 2. The runtime sends `announce` after the `welcome`, and again after each
 *    change of its connectors or of its local access layer.
 * 3. The relay answers each later message of the runtime with an `ack`. The
 *    runtime sends a batch again until it gets the `ack`. Exception: the
 *    relay answers an accepted `feed_entry_keys_request` with
 *    `feed_entry_keys`, and a refused one with an `ack`.
 * 4. The relay sends `close` before it closes the connection.
 *
 * Compatibility: the relay accepts the protocol versions from
 * `MINIMUM_RELAY_PROTOCOL_VERSION` to `RELAY_PROTOCOL_VERSION`. The schemas
 * refuse unknown message types and unknown enum values. Thus a change that a
 * runtime of an older protocol version cannot read (a new message type, a new
 * required field, a new enum value in a message to the runtime) needs a new
 * protocol version, and the relay sends it only to the runtimes of that
 * version or newer. The version of the `hello` is the version of the full
 * connection. `UP_MESSAGE_PROTOCOL_VERSIONS` and
 * `DOWN_MESSAGE_PROTOCOL_VERSIONS` give the version that added each message
 * type. The relay refuses a message type that is newer than the connection
 * like an unknown type (`message_not_valid`).
 */

/** Version 2 adds `feed_entry_keys_request` and `feed_entry_keys` (decision 34) */
export const RELAY_PROTOCOL_VERSION = 2;

/** The relay refuses a `hello` of an older version with `update_necessary` */
export const MINIMUM_RELAY_PROTOCOL_VERSION = 2;

/** The messages from the runtime to the relay */
export enum UpMessageType {
  Hello = "hello",
  Announce = "announce",
  Heartbeat = "heartbeat",
  TokenRenewal = "token_renewal",
  FeedEntries = "feed_entries",
  FeedEntryKeysRequest = "feed_entry_keys_request",
}

/** The messages from the relay to the runtime */
export enum DownMessageType {
  Welcome = "welcome",
  Refusal = "refusal",
  Acknowledgement = "ack",
  Close = "close",
  FeedEntryKeys = "feed_entry_keys",
}

/** The protocol version that added each message type */
export const UP_MESSAGE_PROTOCOL_VERSIONS = {
  [UpMessageType.Hello]: 1,
  [UpMessageType.Announce]: 1,
  [UpMessageType.Heartbeat]: 1,
  [UpMessageType.TokenRenewal]: 1,
  [UpMessageType.FeedEntries]: 1,
  [UpMessageType.FeedEntryKeysRequest]: 2,
} as const satisfies Record<UpMessageType, number>;

/** The protocol version that added each message type */
export const DOWN_MESSAGE_PROTOCOL_VERSIONS = {
  [DownMessageType.Welcome]: 1,
  [DownMessageType.Refusal]: 1,
  [DownMessageType.Acknowledgement]: 1,
  [DownMessageType.Close]: 1,
  [DownMessageType.FeedEntryKeys]: 2,
} as const satisfies Record<DownMessageType, number>;

/**
 * Why the relay refuses a `hello` or closes a connection. Each reason has a
 * close code of the WebSocket (`RELAY_CLOSE_CODES`). See
 * `shouldReconnectAfterClose` for the reasons that make the runtime connect
 * again.
 */
export enum RelayCloseReason {
  /**
   * No valid token: the token is missing, expired, or the renewal did not
   * come within the grace time
   */
  TokenNotValid = "token_not_valid",
  /** The protocol version of the runtime is older than the minimum version */
  UpdateNecessary = "update_necessary",
  /** The protocol version of the runtime is newer than the relay knows */
  ProtocolVersionTooNew = "protocol_version_too_new",
  /** The relay service stops, for example for a new release */
  RelayServiceRestart = "relay_service_restart",
  /** The runtime made more than `RELAY_LIMITS.maximumErrorsPerMinute` errors */
  TooManyErrors = "too_many_errors",
  /** The owner has `RELAY_LIMITS.maximumRuntimesPerOwner` runtimes online */
  TooManyRuntimes = "too_many_runtimes",
  /**
   * The user is banned, or has no `remoteControlProgram;use` or no citizen
   * any more, or the OAuth grant of the desktop companion is revoked
   */
  AccessDenied = "access_denied",
  /** The switch of the full Remote Control Program is off */
  ProgramTurnedOff = "program_turned_off",
  /** A new connection with the same runtime id replaced this connection */
  Replaced = "replaced",
  /** No `heartbeat` in `RELAY_LIMITS.presenceLeaseMilliseconds` */
  HeartbeatMissing = "heartbeat_missing",
}

/** The private range 4000 to 4999 of the WebSocket close codes */
export const RELAY_CLOSE_CODES = {
  [RelayCloseReason.TokenNotValid]: 4000,
  [RelayCloseReason.UpdateNecessary]: 4001,
  [RelayCloseReason.ProtocolVersionTooNew]: 4002,
  [RelayCloseReason.RelayServiceRestart]: 4003,
  [RelayCloseReason.TooManyErrors]: 4004,
  [RelayCloseReason.TooManyRuntimes]: 4005,
  [RelayCloseReason.AccessDenied]: 4006,
  [RelayCloseReason.ProgramTurnedOff]: 4007,
  [RelayCloseReason.Replaced]: 4008,
  [RelayCloseReason.HeartbeatMissing]: 4009,
} as const satisfies Record<RelayCloseReason, number>;

const CLOSE_REASONS_BY_CODE = new Map<number, RelayCloseReason>(
  Object.values(RelayCloseReason).map((reason) => [
    RELAY_CLOSE_CODES[reason],
    reason,
  ]),
);

/** Null for a code that the relay does not send, for example 1006 */
export const getRelayCloseReasonOfCode = (code: number) =>
  CLOSE_REASONS_BY_CODE.get(code) ?? null;

/**
 * Tells if the runtime connects again after a close. The runtime connects
 * again after a random delay that grows with each failed attempt. Null is a
 * close without a reason of the relay, for example a lost network
 * connection (1006).
 */
export const shouldReconnectAfterClose = (reason: RelayCloseReason | null) => {
  if (reason === null) return true;

  switch (reason) {
    // The runtime gets a new token. The token route refuses a user without access.
    case RelayCloseReason.TokenNotValid:
    case RelayCloseReason.ProtocolVersionTooNew:
    case RelayCloseReason.RelayServiceRestart:
    case RelayCloseReason.TooManyErrors:
    // A different runtime of the owner can go offline
    case RelayCloseReason.TooManyRuntimes:
    case RelayCloseReason.ProgramTurnedOff:
    case RelayCloseReason.HeartbeatMissing:
      return true;

    // The runtime tells the owner to update (the browser runtime: to reload the page)
    case RelayCloseReason.UpdateNecessary:
    // The runtime tells the owner. A page reload starts a new attempt.
    case RelayCloseReason.AccessDenied:
    // The newer connection of the same runtime continues
    case RelayCloseReason.Replaced:
      return false;

    default:
      throw new Error(`Unknown close reason: ${reason satisfies never}`);
  }
};

/** Null when the relay accepts the protocol version */
export const getRefusalReasonOfProtocolVersion = (protocolVersion: number) => {
  if (protocolVersion < MINIMUM_RELAY_PROTOCOL_VERSION)
    return RelayCloseReason.UpdateNecessary;
  if (protocolVersion > RELAY_PROTOCOL_VERSION)
    return RelayCloseReason.ProtocolVersionTooNew;
  return null;
};

export enum AcknowledgementResult {
  Accepted = "accepted",
  Refused = "refused",
}

/**
 * Why the relay refused a message. "Send again" tells if the runtime sends
 * the same message again after a delay.
 */
export enum AcknowledgementErrorCode {
  /**
   * The content does not match the schema of its type, or the type is newer
   * than the protocol version of the connection. Do not send again.
   */
  MessageNotValid = "message_not_valid",
  /**
   * The runtime did not announce the connector or the capability of the
   * batch. Send again after the `announce`.
   */
  CapabilityNotAnnounced = "capability_not_announced",
  /**
   * The runtime sent above the rate of the message type, for example of the
   * capability of a batch (see `minimumUploadIntervalMilliseconds`) or of
   * `feed_entry_keys_request` (see `RELAY_LIMITS`). Send again after the
   * interval.
   */
  RateLimitExceeded = "rate_limit_exceeded",
  /**
   * An entry does not match its pattern, still contains an IP address or has
   * no valid time. Do not send again.
   */
  EntriesNotValid = "entries_not_valid",
  /**
   * The relay could not verify the token of a `token_renewal`. Send again
   * with a new token. The relay closes the connection when the grace time of
   * the last valid token ends.
   */
  TokenNotValid = "token_not_valid",
  /** A temporary error of the relay. Send again. */
  InternalError = "internal_error",
}

/**
 * Bounds the length of the type in the envelope, which the relay reads
 * before it knows the type
 */
const MAXIMUM_MESSAGE_TYPE_LENGTH = 64;

/**
 * An ES256 token of SAM has approximately 600 characters. The limit leaves
 * space for more claims.
 */
const MAXIMUM_TOKEN_LENGTH = 4_096;

/** For example "1.2.3" or the short hash of a commit */
const MAXIMUM_RUNTIME_VERSION_LENGTH = 64;

/** Far above the catalog. The limits bound the work for one message. */
const MAXIMUM_ANNOUNCED_CONNECTORS = 16;
const MAXIMUM_ANNOUNCED_CAPABILITIES = 64;

/**
 * A UUID in lowercase letters, as `crypto.randomUUID()` and the `uuid` crate
 * of Rust make it. The runtime makes it once and keeps it. Lowercase only,
 * because the database compares the text.
 */
const RUNTIME_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const RUNTIME_VERSION_PATTERN = /^[0-9A-Za-z._+-]+$/;

export const runtimeIdSchema = z.string().regex(RUNTIME_ID_PATTERN);

/**
 * A connection token of the protocol. The internal requests of the app to the
 * relay service have tokens of the same kind and size.
 */
export const connectionTokenSchema = z
  .string()
  .min(1)
  .max(MAXIMUM_TOKEN_LENGTH);

export const runtimeVersionSchema = z
  .string()
  .min(1)
  .max(MAXIMUM_RUNTIME_VERSION_LENGTH)
  .regex(RUNTIME_VERSION_PATTERN);

export const protocolVersionSchema = z.int32().min(1);

const messageIdSchema = z.uuid();
const versionSchema = z.int32().min(1);

/** The unique key of a feed entry: for `log_entries`, its hash (`createLogEntryHash`) */
const feedEntryKeySchema = z.string().regex(LOG_ANALYZER_ENTRY_HASH_PATTERN);

const envelopeSchema = z.object({
  type: z.string().max(MAXIMUM_MESSAGE_TYPE_LENGTH),
  id: messageIdSchema,
  protocol_version: protocolVersionSchema,
  content: z.unknown(),
});

const createMessageSchema = <
  Type extends UpMessageType | DownMessageType,
  Content extends z.ZodType,
>(
  type: Type,
  content: Content,
) =>
  z.object({
    type: z.literal(type),
    id: messageIdSchema,
    /** The version of the sender. In `hello`, the version of the handshake. */
    protocol_version: protocolVersionSchema,
    content,
  });

const helloContentSchema = z.object({
  /**
   * The connection token. The first message carries it, because a browser
   * cannot set a header on a WebSocket request, and a token in the URL goes
   * into the access logs.
   */
  token: connectionTokenSchema,
  /** The relay refuses an id that is different from the id in the token */
  runtime_id: runtimeIdSchema,
  runtime_kind: z.enum(RuntimeKind),
  runtime_version: runtimeVersionSchema,
});

export const announceContentSchema = z.object({
  /**
   * The connectors that can read their interface now. A connector without
   * access (for example a log file connector without the permission for the
   * folder) is not in the list.
   */
  connectors: z
    .array(
      z.object({
        id: z.enum(ConnectorId),
        version: versionSchema,
        capabilities: z
          .array(z.object({ id: z.enum(CapabilityId), version: versionSchema }))
          .max(MAXIMUM_ANNOUNCED_CAPABILITIES),
      }),
    )
    .max(MAXIMUM_ANNOUNCED_CONNECTORS),
  /** A summary of the local access layer, for the sharing popover and the control UIs */
  local_access_layer: z.object({
    capability_rules: z
      .array(
        z.object({
          capability_id: z.enum(CapabilityId),
          /** The capability leaves the machine */
          is_on: z.boolean(),
          /** Only a part leaves the machine, for example some log entry types */
          is_filtered: z.boolean(),
        }),
      )
      .max(MAXIMUM_ANNOUNCED_CAPABILITIES),
  }),
});

export type AnnounceContent = z.infer<typeof announceContentSchema>;

/**
 * One line of `log_entries`. The runtime sends no hash: the relay must
 * calculate the hash from the line itself, because the runtime controls the
 * input. The runtime can calculate the same hash with the shared rule, for
 * example to remove duplicates in its own view.
 */
const logEntrySchema = z.object({
  type: z.enum(LogAnalyzerEntryType),
  /**
   * The full text that the pattern matched, with the IP marker. It can span
   * two lines of the log file.
   */
  raw_line: z.string().min(1).max(LOG_ENTRIES_CAPABILITY.maximumRawLineLength),
  /**
   * The time of the observation. The relay uses the time of the raw line
   * when the pattern has one (see `takesTimeOfPrecedingLine`).
   */
  event_at: z.iso.datetime(),
  /** The number of the line in its log file. The first line has the number 1. */
  line_number: z.int32().min(1),
  /**
   * The game environment from the header of the log file of the line, for
   * example `LIVE` or `PTU` (see `readLogFileHeader`). Null: the header has
   * no valid value.
   */
  game_environment: gameEnvironmentSchema.nullable(),
  /**
   * The build number from the header of the log file of the line, for
   * example `13220821`. Null: the header has no valid value.
   */
  game_build: gameBuildSchema.nullable(),
});

const logEntriesBatchSchema = z.object({
  capability_id: z.literal(CapabilityId.LogEntries),
  capability_version: z.literal(LOG_ENTRIES_CAPABILITY.version),
  connector_id: z.enum(ConnectorId),
  connector_version: versionSchema,
  entries: z
    .array(logEntrySchema)
    .min(1)
    .max(LOG_ENTRIES_CAPABILITY.maximumEntriesPerBatch),
});

/**
 * One batch of one feed capability. A new capability is a new option. The
 * relay accepts only the current version of each capability. To accept two
 * versions of a capability, make an inner discriminated union on
 * `capability_version`.
 */
export const feedEntriesContentSchema = z.discriminatedUnion("capability_id", [
  logEntriesBatchSchema,
]);

export type FeedEntriesContent = z.infer<typeof feedEntriesContentSchema>;

/** The capability and the connector of a batch, with their versions */
export type FeedEntriesSource = Omit<FeedEntriesContent, "entries">;

/**
 * The connector, the capability and both versions of the source are in the
 * announcement. The relay refuses a batch of a source that the runtime did
 * not announce, thus the runtime sends only these batches.
 */
export const isFeedSourceAnnounced = (
  announcement: AnnounceContent,
  source: FeedEntriesSource,
) =>
  announcement.connectors.some(
    (connector) =>
      connector.id === source.connector_id &&
      connector.version === source.connector_version &&
      connector.capabilities.some(
        (capability) =>
          capability.id === source.capability_id &&
          capability.version === source.capability_version,
      ),
  );

/**
 * The keys of the own entries of a feed capability whose time of the
 * observation is in the time window, for the entries that the relay already
 * has (decision 34). The keys contain the entries of the accepted batches
 * that the runtime sent before the request.
 */
const feedEntryKeysRequestContentSchema = z.object({
  capability_id: z.literal(CapabilityId.LogEntries),
  /** The start of the time window. Without it: no limit. */
  start: z.iso.datetime().optional(),
  /** Exclusive. Without it: no limit. */
  end: z.iso.datetime().optional(),
  /** The `next_page_cursor` of the previous page. Absent for the first page. */
  page_cursor: feedEntryKeySchema.optional(),
});

export type FeedEntryKeysRequestContent = z.infer<
  typeof feedEntryKeysRequestContentSchema
>;

const closeReasonContentSchema = z.object({
  reason: z.enum(RelayCloseReason),
});

export const upMessageSchema = z.discriminatedUnion("type", [
  createMessageSchema(UpMessageType.Hello, helloContentSchema),
  createMessageSchema(UpMessageType.Announce, announceContentSchema),
  /** The relay renews the lease of the presence */
  createMessageSchema(UpMessageType.Heartbeat, z.object({})),
  createMessageSchema(
    UpMessageType.TokenRenewal,
    z.object({ token: connectionTokenSchema }),
  ),
  createMessageSchema(UpMessageType.FeedEntries, feedEntriesContentSchema),
  createMessageSchema(
    UpMessageType.FeedEntryKeysRequest,
    feedEntryKeysRequestContentSchema,
  ),
]);

export const downMessageSchema = z.discriminatedUnion("type", [
  createMessageSchema(DownMessageType.Welcome, z.object({})),
  /** The relay closes the connection with the code of the reason after it */
  createMessageSchema(DownMessageType.Refusal, closeReasonContentSchema),
  createMessageSchema(
    DownMessageType.Acknowledgement,
    z.discriminatedUnion("result", [
      z.object({
        message_id: messageIdSchema,
        result: z.literal(AcknowledgementResult.Accepted),
        /** For `feed_entries`: the entries that the relay did not have before */
        new_entry_count: z.int32().min(0).optional(),
      }),
      z.object({
        message_id: messageIdSchema,
        result: z.literal(AcknowledgementResult.Refused),
        error_code: z.enum(AcknowledgementErrorCode),
      }),
    ]),
  ),
  /**
   * The relay sends it right before it closes the connection with the code
   * of the reason. A proxy can change the close code (for example to 1006),
   * thus the runtime prefers the reason of this message.
   */
  createMessageSchema(DownMessageType.Close, closeReasonContentSchema),
  /** The answer to an accepted `feed_entry_keys_request` */
  createMessageSchema(
    DownMessageType.FeedEntryKeys,
    z.object({
      /** The id of the `feed_entry_keys_request` */
      message_id: messageIdSchema,
      /** In ascending order */
      keys: z
        .array(feedEntryKeySchema)
        .max(RELAY_LIMITS.maximumFeedEntryKeysPerPage),
      /** The `page_cursor` of the next page. Null: the last page. */
      next_page_cursor: feedEntryKeySchema.nullable(),
    }),
  ),
]);

export type UpMessage = z.infer<typeof upMessageSchema>;
export type DownMessage = z.infer<typeof downMessageSchema>;

export type UpMessageOfType<Type extends UpMessageType> = Extract<
  UpMessage,
  { readonly type: Type }
>;

export type DownMessageOfType<Type extends DownMessageType> = Extract<
  DownMessage,
  { readonly type: Type }
>;

/** Wraps the content into an envelope with a new message id */
export const createUpMessage = <Type extends UpMessageType>(
  type: Type,
  content: UpMessageOfType<Type>["content"],
) =>
  ({
    type,
    id: crypto.randomUUID(),
    protocol_version: RELAY_PROTOCOL_VERSION,
    content,
  }) as UpMessageOfType<Type>;

/** Wraps the content into an envelope with a new message id */
export const createDownMessage = <Type extends DownMessageType>(
  type: Type,
  content: DownMessageOfType<Type>["content"],
) =>
  ({
    type,
    id: crypto.randomUUID(),
    protocol_version: RELAY_PROTOCOL_VERSION,
    content,
  }) as DownMessageOfType<Type>;

export enum RelayMessageParseProblem {
  NotJson = "not_json",
  EnvelopeNotValid = "envelope_not_valid",
  UnknownType = "unknown_type",
  ContentNotValid = "content_not_valid",
}

export type RelayMessageParseResult<Message> =
  | { readonly success: true; readonly message: Message }
  | {
      readonly success: false;
      readonly problem: RelayMessageParseProblem;
      /**
       * The id of a message with a valid envelope, thus the relay can refuse
       * it with an `ack`
       */
      readonly messageId: string | null;
      /**
       * The protocol version of a message with a valid envelope, thus the
       * relay can refuse a `hello` of a newer version that it cannot read
       * with `protocol_version_too_new`
       */
      readonly protocolVersion: number | null;
    };

const parseMessage = <Message>(
  text: string,
  schema: z.ZodType<Message>,
  messageTypes: ReadonlySet<string>,
): RelayMessageParseResult<Message> => {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return {
      success: false,
      problem: RelayMessageParseProblem.NotJson,
      messageId: null,
      protocolVersion: null,
    };
  }

  const envelope = envelopeSchema.safeParse(value);
  if (!envelope.success)
    return {
      success: false,
      problem: RelayMessageParseProblem.EnvelopeNotValid,
      messageId: null,
      protocolVersion: null,
    };

  if (!messageTypes.has(envelope.data.type))
    return {
      success: false,
      problem: RelayMessageParseProblem.UnknownType,
      messageId: envelope.data.id,
      protocolVersion: envelope.data.protocol_version,
    };

  const message = schema.safeParse(value);
  if (!message.success)
    return {
      success: false,
      problem: RelayMessageParseProblem.ContentNotValid,
      messageId: envelope.data.id,
      protocolVersion: envelope.data.protocol_version,
    };

  return { success: true, message: message.data };
};

const UP_MESSAGE_TYPES: ReadonlySet<string> = new Set(
  Object.values(UpMessageType),
);

const DOWN_MESSAGE_TYPES: ReadonlySet<string> = new Set(
  Object.values(DownMessageType),
);

/**
 * Reads the text of one WebSocket message of a runtime. The relay service
 * limits the size of the text before (`RELAY_LIMITS.maximumMessageBytes`).
 */
export const parseUpMessage = (text: string) =>
  parseMessage(text, upMessageSchema, UP_MESSAGE_TYPES);

/** Reads the text of one WebSocket message of the relay */
export const parseDownMessage = (text: string) =>
  parseMessage(text, downMessageSchema, DOWN_MESSAGE_TYPES);
