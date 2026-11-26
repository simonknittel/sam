import {
  RelayCloseReason,
  type AnnounceContent,
  type CapabilityId,
  type FeedEntriesContent,
  type FeedEntriesSource,
  type RuntimeKind,
} from "@sam-monorepo/domain";

/** The types of the channel client (see `channelClient.ts`) */

export type FeedEntry = FeedEntriesContent["entries"][number];

export enum ChannelStatus {
  /** `connect()` did not start the client, or `disconnect()` stopped it */
  Idle = "idle",
  /** The client gets a token, opens the connection and waits for the `welcome` */
  Connecting = "connecting",
  /** The relay sent the `welcome` */
  Connected = "connected",
  /** The client waits for the delay before the next attempt */
  WaitingForReconnect = "waiting_for_reconnect",
  /**
   * The client does not connect again, for example after `update_necessary`
   * or without a relay (see `closeReason`). A call of `connect()` starts a
   * new attempt.
   */
  Ended = "ended",
}

/** Why the client ended without a close of the relay */
export enum ChannelEndReason {
  /** The app has no relay service: the runtime works only on this machine */
  NoRelay = "no_relay",
  /**
   * The app refused the token, because the session of the user ended (401).
   * The user must log in again.
   */
  SessionExpired = "session_expired",
  /**
   * The session belongs to a different citizen now, for example after a
   * login with a different account in a different tab. The runtime must not
   * upload with the token of a different citizen. The page must load again.
   */
  CitizenChanged = "citizen_changed",
}

export type ChannelCloseReason = RelayCloseReason | ChannelEndReason;

export interface ChannelState {
  readonly status: ChannelStatus;
  /**
   * The last reason of a refusal or a close since the last `welcome`. A close
   * without a reason (for example a lost network connection) keeps the
   * previous reason. `access_denied` also comes from a token that the app
   * refused (403), and `token_not_valid` from a token renewal that did not
   * succeed within the grace time.
   */
  readonly closeReason: ChannelCloseReason | null;
  /** The entries that wait for the upload or for their `ack` */
  readonly queuedEntryCount: number;
}

export const INITIAL_CHANNEL_STATE: ChannelState = {
  status: ChannelStatus.Idle,
  closeReason: null,
  queuedEntryCount: 0,
};

/** The Unleash flag of the organization turned off the Remote Control Program */
export const isProgramTurnedOff = (state: ChannelState) =>
  state.closeReason === RelayCloseReason.ProgramTurnedOff;

export enum ChannelDropReason {
  /**
   * The queue was full (`CHANNEL_CLIENT_LIMITS.maximumQueuedEntries`), thus
   * the client removed the oldest waiting entries
   */
  QueueFull = "queue_full",
  /**
   * One entry does not fit into one message
   * (`RELAY_LIMITS.maximumMessageBytes`)
   */
  MessageTooLarge = "message_too_large",
  /** The Unleash flag of the organization turned off the Remote Control Program */
  TurnedOff = "turned_off",
  /** The rule of the capability (or of the entry) is off */
  LocalAccessLayer = "local_access_layer",
  /** The relay refused the entries, and the protocol says: do not send again */
  RefusedByRelay = "refused_by_relay",
}

export interface ChannelAcceptedEntries {
  readonly capabilityId: CapabilityId;
  readonly entryCount: number;
  /**
   * The entries that the relay did not have before. Null when the relay did
   * not tell.
   */
  readonly newEntryCount: number | null;
}

export interface ChannelDroppedEntries {
  readonly capabilityId: CapabilityId;
  readonly entryCount: number;
  readonly reason: ChannelDropReason;
}

/** The reasons of the token source for a refused token */
export type ConnectionTokenRefusalReason =
  | RelayCloseReason.AccessDenied
  | ChannelEndReason.SessionExpired
  | ChannelEndReason.CitizenChanged;

/**
 * The token source throws this error when it refuses the connection token:
 * the app refused it (for example without `remoteControlProgram;use`,
 * without a citizen, after a ban, or without a session), or the token is
 * for a different citizen. The client then ends with the reason as its
 * `closeReason`. After a different error of the token source, the client
 * tries again.
 */
export class ConnectionTokenRefusedError extends Error {
  readonly reason: ConnectionTokenRefusalReason;

  constructor(reason: ConnectionTokenRefusalReason, options?: ErrorOptions) {
    super(`The connection token was refused: ${reason}`, options);
    this.name = "ConnectionTokenRefusedError";
    this.reason = reason;
  }
}

/** The answer of the token source */
export interface ConnectionTokenGrant {
  readonly token: string;
  /**
   * The WebSocket URL of the relay service. Null when the app has no relay
   * service.
   */
  readonly relayUrl: URL | null;
}

/** The calls of the WebSocket that the client receives */
export interface ChannelWebSocketHandlers {
  readonly onOpen: () => void;
  readonly onMessage: (data: unknown) => void;
  readonly onClose: (code: number) => void;
}

/** The part of a WebSocket that the client uses */
export interface ChannelWebSocket {
  send(data: string): void;
  close(): void;
}

export type CreateChannelWebSocket = (
  url: URL,
  handlers: ChannelWebSocketHandlers,
) => ChannelWebSocket;

export interface ChannelTimers {
  /**
   * A time in milliseconds that does not go back, as `performance.now()`
   * gives it
   */
  readonly now: () => number;
  /**
   * Calls the callback once after the delay. The returned function cancels
   * the call.
   */
  readonly schedule: (
    callback: () => void,
    delayMilliseconds: number,
  ) => () => void;
}

/** `performance.now()` and `setTimeout()` */
export const DEFAULT_TIMERS: ChannelTimers = {
  now: () => performance.now(),
  schedule: (callback, delayMilliseconds) => {
    const handle = setTimeout(callback, delayMilliseconds);
    return () => clearTimeout(handle);
  },
};

export interface ChannelClientOptions {
  /** The id that the runtime makes once and keeps (see `runtimeIdSchema`) */
  readonly runtimeId: string;
  readonly runtimeKind: RuntimeKind;
  readonly runtimeVersion: string;
  /** The first announcement. `updateAnnouncement()` changes it. */
  readonly announcement: AnnounceContent;
  /**
   * Gives a new connection token and the URL of the relay, for the `hello`
   * and for each renewal. It throws `ConnectionTokenRefusedError` when it
   * refuses the token. The client aborts the signal after
   * `CHANNEL_CLIENT_LIMITS.tokenRequestTimeoutMilliseconds`.
   */
  readonly getConnectionToken: (
    signal: AbortSignal,
  ) => Promise<ConnectionTokenGrant>;
  /**
   * The entries of a batch that the local access layer permits now. The
   * client asks it before each send (also before a resend after a
   * reconnect) and after each change of the announcement, and removes the
   * other entries. Without it, the client sends all entries of a capability
   * that is on.
   */
  readonly selectPermittedEntries?: (
    source: FeedEntriesSource,
    entries: readonly FeedEntry[],
  ) => readonly FeedEntry[];
  /** The browser `WebSocket` by default */
  readonly createWebSocket?: CreateChannelWebSocket;
  /** `DEFAULT_TIMERS` by default */
  readonly timers?: ChannelTimers;
  /** `Math.random()` by default */
  readonly random?: () => number;
  readonly onEntriesAccepted?: (entries: ChannelAcceptedEntries) => void;
  readonly onEntriesDropped?: (entries: ChannelDroppedEntries) => void;
}

export type ChannelStateListener = (state: ChannelState) => void;
