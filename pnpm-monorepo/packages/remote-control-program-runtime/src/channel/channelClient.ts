import {
  AcknowledgementErrorCode,
  AcknowledgementResult,
  CAPABILITY_CATALOG,
  DownMessageType,
  RELAY_LIMITS,
  RateLimiter,
  RelayCloseReason,
  UpMessageType,
  createUpMessage,
  getRelayCloseReasonOfCode,
  parseDownMessage,
  shouldReconnectAfterClose,
  type AnnounceContent,
  type CapabilityId,
  type ConnectorId,
  type DownMessageOfType,
  type FeedEntriesContent,
  type RuntimeKind,
  type UpMessage,
} from "@sam-monorepo/domain";
import { CHANNEL_CLIENT_LIMITS } from "./channelLimits.js";
import { getReconnectDelayMilliseconds } from "./reconnectDelay.js";
import {
  UploadQueue,
  type FeedEntriesSource,
  type QueuedBatch,
} from "./uploadQueue.js";

/**
 * The channel client: the WebSocket client of a runtime for the protocol of
 * the relay service (see `protocol.ts` of the domain package). It does the
 * handshake and the announcement, sends the heartbeats, renews the token,
 * uploads the feed entries until their `ack`, connects again after a lost
 * connection, and obeys the switches and the "Stop all" of the owner.
 */

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
   * (see `closeReason`). A call of `connect()` starts a new attempt.
   */
  Ended = "ended",
}

export interface ChannelState {
  readonly status: ChannelStatus;
  /**
   * The last reason of a refusal or a close since the last `welcome`. A close
   * without a reason (for example a lost network connection) keeps the
   * previous reason. `access_denied` also comes from a token that the app
   * refused, and `token_not_valid` from a token renewal that did not succeed
   * within the grace time.
   */
  readonly closeReason: RelayCloseReason | null;
  /** The "Stop all" of the owner is active (`stop` of the relay) */
  readonly isStoppedByOwner: boolean;
  /** The parts that the switches of the organization turned off */
  readonly turnedOffConnectorIds: readonly ConnectorId[];
  readonly turnedOffCapabilityIds: readonly CapabilityId[];
  /** The entries that wait for the upload or for their `ack` */
  readonly queuedEntryCount: number;
}

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
  /**
   * A switch of the organization turned off the connector, the capability or
   * the full Remote Control Program
   */
  TurnedOff = "turned_off",
  /** The "Stop all" of the owner is active */
  StoppedByOwner = "stopped_by_owner",
  /**
   * The "Stop all" of the runtime is active, or the rule of the capability is
   * off
   */
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

/**
 * The token source throws this error when the app refuses the connection
 * token, for example without `remoteControlProgram;use`, without a citizen,
 * or after a ban. The client then stops like after `access_denied` of the
 * relay. After a different error of the token source, the client tries
 * again.
 */
export class ConnectionTokenRefusedError extends Error {
  constructor(options?: ErrorOptions) {
    super("The app refused the connection token", options);
    this.name = "ConnectionTokenRefusedError";
  }
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

export interface ChannelClientOptions {
  /** The WebSocket URL of the relay service */
  readonly relayUrl: URL;
  /** The id that the runtime makes once and keeps (see `runtimeIdSchema`) */
  readonly runtimeId: string;
  readonly runtimeKind: RuntimeKind;
  readonly runtimeVersion: string;
  /** The first announcement. `updateAnnouncement()` changes it. */
  readonly announcement: AnnounceContent;
  /**
   * Gives a new connection token for the `hello` and for each renewal. It
   * throws `ConnectionTokenRefusedError` when the app refuses the token. The
   * client aborts the signal after
   * `CHANNEL_CLIENT_LIMITS.tokenRequestTimeoutMilliseconds`.
   */
  readonly getConnectionToken: (signal: AbortSignal) => Promise<string>;
  /** The browser `WebSocket` by default */
  readonly createWebSocket?: CreateChannelWebSocket;
  /** `performance.now()` and `setTimeout()` by default */
  readonly timers?: ChannelTimers;
  /** `Math.random()` by default */
  readonly random?: () => number;
  readonly onEntriesAccepted?: (entries: ChannelAcceptedEntries) => void;
  readonly onEntriesDropped?: (entries: ChannelDroppedEntries) => void;
}

export type ChannelStateListener = (state: ChannelState) => void;

const createBrowserWebSocket: CreateChannelWebSocket = (url, handlers) => {
  const socket = new WebSocket(url);
  socket.addEventListener("open", () => handlers.onOpen());
  socket.addEventListener("message", (event) => handlers.onMessage(event.data));
  socket.addEventListener("close", (event) => handlers.onClose(event.code));
  return socket;
};

const defaultTimers: ChannelTimers = {
  now: () => performance.now(),
  schedule: (callback, delayMilliseconds) => {
    const handle = setTimeout(callback, delayMilliseconds);
    return () => clearTimeout(handle);
  },
};

enum ConnectionTimer {
  Handshake = "handshake",
  Heartbeat = "heartbeat",
  TokenRenewal = "token_renewal",
  TokenExpiry = "token_expiry",
  AnnounceRetry = "announce_retry",
}

/** The state of one connection attempt, from the token request to the close */
interface Connection {
  socket: ChannelWebSocket | null;
  isWelcomed: boolean;
  /** The first `ack` of a heartbeat shows a stable connection */
  isStable: boolean;
  /** The request time of the last token that the relay accepted */
  tokenRequestedAt: number;
  outstandingHeartbeatId: string | null;
  renewal: { readonly messageId: string; readonly requestedAt: number } | null;
  readonly sentAnnouncements: Map<string, AnnounceContent>;
  /** The client sends batches only for the parts of this announcement */
  acknowledgedAnnouncement: AnnounceContent | null;
  readonly cancelTimers: Map<ConnectionTimer, () => void>;
  readonly tokenRequests: Set<AbortController>;
}

const isAnnounced = (
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

export class ChannelClient {
  readonly #options: ChannelClientOptions;
  readonly #timers: ChannelTimers;
  readonly #random: () => number;
  readonly #createWebSocket: CreateChannelWebSocket;
  readonly #queue = new UploadQueue(CHANNEL_CLIENT_LIMITS.maximumQueuedEntries);
  readonly #rateLimiters = new Map<CapabilityId, RateLimiter>();
  readonly #listeners = new Set<ChannelStateListener>();
  #announcement: AnnounceContent;
  #state: ChannelState = {
    status: ChannelStatus.Idle,
    closeReason: null,
    isStoppedByOwner: false,
    turnedOffConnectorIds: [],
    turnedOffCapabilityIds: [],
    queuedEntryCount: 0,
  };
  #connection: Connection | null = null;
  #failedAttemptCount = 0;
  #cancelReconnect: (() => void) | null = null;
  #cancelUploadTimer: (() => void) | null = null;

  constructor(options: ChannelClientOptions) {
    this.#options = options;
    this.#timers = options.timers ?? defaultTimers;
    this.#random = options.random ?? Math.random;
    this.#createWebSocket = options.createWebSocket ?? createBrowserWebSocket;
    this.#announcement = options.announcement;
  }

  getState() {
    return this.#state;
  }

  /** Returns the function that ends the subscription */
  subscribe(listener: ChannelStateListener) {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  connect() {
    if (
      this.#state.status !== ChannelStatus.Idle &&
      this.#state.status !== ChannelStatus.Ended
    )
      return;

    this.#failedAttemptCount = 0;
    this.#setState({ closeReason: null });
    this.#applyAccessChange();
    this.#startAttempt();
  }

  /**
   * Closes the connection. The queue keeps the entries for a later
   * `connect()`.
   */
  disconnect() {
    this.#cancelReconnect?.();
    this.#cancelReconnect = null;
    if (this.#connection !== null) this.#closeConnection(this.#connection);
    this.#setState({ status: ChannelStatus.Idle, closeReason: null });
  }

  /**
   * Sends the changed announcement to the relay. The client also removes the
   * waiting entries that the local access layer does not permit any more.
   */
  updateAnnouncement(announcement: AnnounceContent) {
    this.#announcement = announcement;
    this.#applyAccessChange();

    const connection = this.#connection;
    if (connection?.isWelcomed) this.#sendAnnouncement(connection);
  }

  /**
   * Queues the entries for the upload. The client sends them in batches when
   * the relay accepted an announcement that contains the connector and the
   * capability, and keeps each batch until its `ack`. `onEntriesDropped`
   * tells about the entries that do not go up.
   */
  sendFeedEntries(content: FeedEntriesContent) {
    const { entries, ...source } = content;
    if (entries.length === 0) return;

    const dropReason = this.#getDropReason(source);
    if (dropReason !== null) {
      this.#reportDropped(source.capability_id, entries.length, dropReason);
      return;
    }

    const { droppedBatches, tooLargeEntryCount } = this.#queue.add(
      source,
      entries,
    );
    if (tooLargeEntryCount > 0)
      this.#reportDropped(
        source.capability_id,
        tooLargeEntryCount,
        ChannelDropReason.MessageTooLarge,
      );
    for (const batch of droppedBatches)
      this.#reportDroppedBatch(batch, ChannelDropReason.QueueFull);

    this.#updateQueuedEntryCount();
    this.#sendWaitingBatches();
  }

  #setState(changes: Partial<ChannelState>) {
    this.#state = { ...this.#state, ...changes };
    for (const listener of this.#listeners) listener(this.#state);
  }

  #updateQueuedEntryCount() {
    if (this.#queue.entryCount !== this.#state.queuedEntryCount)
      this.#setState({ queuedEntryCount: this.#queue.entryCount });
  }

  /**
   * A part that is off does not upload. The client removes its entries and
   * does not keep them for later: an automatic upload after the part is on
   * again would send entries of a time in which the part was off. The lines
   * stay in the log file on the machine, and only an explicit request of the
   * owner sends older entries (decision 6 of the plan, "Switches" of the
   * concept).
   */
  #getDropReason(source: FeedEntriesSource) {
    const {
      closeReason,
      turnedOffConnectorIds,
      turnedOffCapabilityIds,
      isStoppedByOwner,
    } = this.#state;

    if (
      closeReason === RelayCloseReason.ProgramTurnedOff ||
      turnedOffConnectorIds.includes(source.connector_id) ||
      turnedOffCapabilityIds.includes(source.capability_id)
    )
      return ChannelDropReason.TurnedOff;

    if (isStoppedByOwner) return ChannelDropReason.StoppedByOwner;

    // All is off by default (principle 2): a capability without a rule does
    // not upload
    const localAccessLayer = this.#announcement.local_access_layer;
    const isCapabilityOn = localAccessLayer.capability_rules.some(
      (rule) => rule.capability_id === source.capability_id && rule.is_on,
    );
    if (localAccessLayer.is_stopped || !isCapabilityOn)
      return ChannelDropReason.LocalAccessLayer;

    return null;
  }

  #reportDropped(
    capabilityId: CapabilityId,
    entryCount: number,
    reason: ChannelDropReason,
  ) {
    this.#options.onEntriesDropped?.({ capabilityId, entryCount, reason });
  }

  #reportDroppedBatch(batch: QueuedBatch, reason: ChannelDropReason) {
    this.#reportDropped(
      batch.source.capability_id,
      batch.entries.length,
      reason,
    );
  }

  /** After a change of the switches, of the stop or of the local access layer */
  #applyAccessChange() {
    const droppedBatches = this.#queue.removeWaiting(
      (batch) => this.#getDropReason(batch.source) !== null,
    );
    for (const batch of droppedBatches) {
      const reason = this.#getDropReason(batch.source);
      if (reason !== null) this.#reportDroppedBatch(batch, reason);
    }

    this.#updateQueuedEntryCount();
    this.#sendWaitingBatches();
  }

  #startAttempt() {
    const connection: Connection = {
      socket: null,
      isWelcomed: false,
      isStable: false,
      tokenRequestedAt: this.#timers.now(),
      outstandingHeartbeatId: null,
      renewal: null,
      sentAnnouncements: new Map(),
      acknowledgedAnnouncement: null,
      cancelTimers: new Map(),
      tokenRequests: new Set(),
    };
    this.#connection = connection;
    this.#setState({ status: ChannelStatus.Connecting });

    void this.#openConnection(connection);
  }

  async #openConnection(connection: Connection) {
    let token: string;
    try {
      token = await this.#requestToken(connection);
    } catch (error) {
      this.#endConnection(
        connection,
        error instanceof ConnectionTokenRefusedError
          ? RelayCloseReason.AccessDenied
          : null,
      );
      return;
    }
    if (this.#connection !== connection) return;

    try {
      connection.socket = this.#createWebSocket(this.#options.relayUrl, {
        onOpen: () => {
          if (this.#connection !== connection) return;

          this.#send(
            connection,
            createUpMessage(UpMessageType.Hello, {
              token,
              runtime_id: this.#options.runtimeId,
              runtime_kind: this.#options.runtimeKind,
              runtime_version: this.#options.runtimeVersion,
            }),
          );
        },
        onMessage: (data) => {
          if (this.#connection === connection)
            this.#handleMessage(connection, data);
        },
        onClose: (code) => {
          this.#endConnection(connection, getRelayCloseReasonOfCode(code));
        },
      });
    } catch {
      this.#endConnection(connection, null);
      return;
    }

    this.#scheduleConnectionTimer(
      connection,
      ConnectionTimer.Handshake,
      RELAY_LIMITS.handshakeTimeoutMilliseconds,
      () => this.#endConnection(connection, null),
    );
  }

  /** Bounds the time of the token source, also when it ignores the signal */
  async #requestToken(connection: Connection) {
    const controller = new AbortController();
    connection.tokenRequests.add(controller);
    const cancelTimeout = this.#timers.schedule(
      () => controller.abort(new Error("The token request timed out")),
      CHANNEL_CLIENT_LIMITS.tokenRequestTimeoutMilliseconds,
    );

    try {
      return await Promise.race([
        this.#options.getConnectionToken(controller.signal),
        new Promise<never>((_resolve, reject) => {
          controller.signal.addEventListener(
            "abort",
            () => reject(controller.signal.reason),
            { once: true },
          );
        }),
      ]);
    } finally {
      cancelTimeout();
      connection.tokenRequests.delete(controller);
    }
  }

  #send(connection: Connection, message: UpMessage) {
    connection.socket?.send(JSON.stringify(message));
  }

  #scheduleConnectionTimer(
    connection: Connection,
    timer: ConnectionTimer,
    delayMilliseconds: number,
    callback: () => void,
  ) {
    connection.cancelTimers.get(timer)?.();
    connection.cancelTimers.set(
      timer,
      this.#timers.schedule(() => {
        connection.cancelTimers.delete(timer);
        if (this.#connection === connection) callback();
      }, delayMilliseconds),
    );
  }

  #cancelConnectionTimer(connection: Connection, timer: ConnectionTimer) {
    connection.cancelTimers.get(timer)?.();
    connection.cancelTimers.delete(timer);
  }

  /** Ends the connection without a change of the status */
  #closeConnection(connection: Connection) {
    this.#connection = null;

    for (const cancelTimer of connection.cancelTimers.values()) cancelTimer();
    connection.cancelTimers.clear();
    for (const controller of connection.tokenRequests)
      controller.abort(new Error("The connection ended"));
    connection.socket?.close();

    this.#cancelUploadTimer?.();
    this.#cancelUploadTimer = null;
    // The relay removes the duplicates with the key of each entry, thus a
    // resend is safe
    this.#queue.returnSent();
  }

  /** @param reason Null for a close without a reason of the relay */
  #endConnection(connection: Connection, reason: RelayCloseReason | null) {
    if (this.#connection !== connection) return;

    this.#closeConnection(connection);

    if (shouldReconnectAfterClose(reason)) {
      this.#failedAttemptCount += 1;
      this.#cancelReconnect = this.#timers.schedule(
        () => {
          this.#cancelReconnect = null;
          this.#startAttempt();
        },
        getReconnectDelayMilliseconds(this.#failedAttemptCount, this.#random),
      );
      this.#setState({
        status: ChannelStatus.WaitingForReconnect,
        closeReason: reason ?? this.#state.closeReason,
      });
    } else {
      this.#setState({ status: ChannelStatus.Ended, closeReason: reason });
    }

    this.#applyAccessChange();
  }

  #handleMessage(connection: Connection, data: unknown) {
    if (typeof data !== "string") return;

    // The relay sends a newer message type only to a runtime of a newer
    // protocol version (see `protocol.ts`). Thus a message that is not valid
    // is a defect, and the client ignores it.
    const result = parseDownMessage(data);
    if (!result.success) return;

    const { message } = result;
    switch (message.type) {
      case DownMessageType.Welcome:
        this.#handleWelcome(connection, message);
        break;

      case DownMessageType.Refusal:
      // The reason of the message has priority over the close code, which a
      // proxy can change
      case DownMessageType.Close:
        this.#endConnection(connection, message.content.reason);
        break;

      case DownMessageType.Acknowledgement:
        this.#handleAcknowledgement(connection, message);
        break;

      case DownMessageType.Switches:
        this.#setState({
          turnedOffConnectorIds: message.content.turned_off_connectors,
          turnedOffCapabilityIds: message.content.turned_off_capabilities,
        });
        this.#applyAccessChange();
        break;

      case DownMessageType.Stop:
        this.#setStoppedByOwner(true);
        break;

      case DownMessageType.Start:
        this.#setStoppedByOwner(false);
        break;

      default:
        throw new Error(
          `Unknown message type: ${JSON.stringify(message satisfies never)}`,
        );
    }
  }

  #handleWelcome(
    connection: Connection,
    message: DownMessageOfType<DownMessageType.Welcome>,
  ) {
    if (connection.isWelcomed) return;

    connection.isWelcomed = true;
    this.#cancelConnectionTimer(connection, ConnectionTimer.Handshake);
    this.#scheduleHeartbeat(connection);
    this.#scheduleTokenTimers(connection);
    this.#sendAnnouncement(connection);

    this.#setState({
      status: ChannelStatus.Connected,
      closeReason: null,
      isStoppedByOwner: message.content.is_stopped,
    });
    this.#applyAccessChange();
  }

  #setStoppedByOwner(isStoppedByOwner: boolean) {
    if (this.#state.isStoppedByOwner === isStoppedByOwner) return;

    this.#setState({ isStoppedByOwner });
    this.#applyAccessChange();
  }

  #scheduleHeartbeat(connection: Connection) {
    this.#scheduleConnectionTimer(
      connection,
      ConnectionTimer.Heartbeat,
      RELAY_LIMITS.heartbeatIntervalMilliseconds,
      () => {
        // The relay did not answer the previous heartbeat within one
        // interval. The connection is dead, for example after a lost network
        // connection without a close.
        if (connection.outstandingHeartbeatId !== null) {
          this.#endConnection(connection, null);
          return;
        }

        const heartbeat = createUpMessage(UpMessageType.Heartbeat, {});
        connection.outstandingHeartbeatId = heartbeat.id;
        this.#send(connection, heartbeat);
        this.#scheduleHeartbeat(connection);
      },
    );
  }

  /**
   * The renewal comes `tokenRenewalIntervalMilliseconds` after the request
   * of the last accepted token. Without an accepted renewal, the client
   * closes the connection when the relay also does: at the end of the grace
   * time after the expiry of the token.
   */
  #scheduleTokenTimers(connection: Connection) {
    const tokenAge = this.#timers.now() - connection.tokenRequestedAt;

    this.#scheduleConnectionTimer(
      connection,
      ConnectionTimer.TokenRenewal,
      Math.max(0, RELAY_LIMITS.tokenRenewalIntervalMilliseconds - tokenAge),
      () => void this.#renewToken(connection),
    );
    this.#scheduleConnectionTimer(
      connection,
      ConnectionTimer.TokenExpiry,
      Math.max(
        0,
        RELAY_LIMITS.connectionTokenLifetimeMilliseconds +
          RELAY_LIMITS.tokenRenewalGraceMilliseconds -
          tokenAge,
      ),
      () => this.#endConnection(connection, RelayCloseReason.TokenNotValid),
    );
  }

  #scheduleTokenRenewalRetry(connection: Connection) {
    this.#scheduleConnectionTimer(
      connection,
      ConnectionTimer.TokenRenewal,
      CHANNEL_CLIENT_LIMITS.retryDelayMilliseconds,
      () => void this.#renewToken(connection),
    );
  }

  async #renewToken(connection: Connection) {
    const requestedAt = this.#timers.now();
    let token: string;
    try {
      token = await this.#requestToken(connection);
    } catch (error) {
      if (this.#connection !== connection) return;

      if (error instanceof ConnectionTokenRefusedError)
        this.#endConnection(connection, RelayCloseReason.AccessDenied);
      else this.#scheduleTokenRenewalRetry(connection);
      return;
    }
    if (this.#connection !== connection) return;

    const message = createUpMessage(UpMessageType.TokenRenewal, { token });
    connection.renewal = { messageId: message.id, requestedAt };
    this.#send(connection, message);
  }

  #sendAnnouncement(connection: Connection) {
    this.#cancelConnectionTimer(connection, ConnectionTimer.AnnounceRetry);

    const message = createUpMessage(UpMessageType.Announce, this.#announcement);
    connection.sentAnnouncements.set(message.id, message.content);
    this.#send(connection, message);
  }

  #handleAcknowledgement(
    connection: Connection,
    message: DownMessageOfType<DownMessageType.Acknowledgement>,
  ) {
    const { content } = message;
    const isAccepted = content.result === AcknowledgementResult.Accepted;

    // Each `ack` of the relay answers a different message. Thus the order of
    // the checks does not matter.
    if (content.message_id === connection.outstandingHeartbeatId) {
      connection.outstandingHeartbeatId = null;
      if (!connection.isStable) {
        connection.isStable = true;
        this.#failedAttemptCount = 0;
      }
      return;
    }

    if (content.message_id === connection.renewal?.messageId) {
      const { requestedAt } = connection.renewal;
      connection.renewal = null;

      if (isAccepted) {
        connection.tokenRequestedAt = requestedAt;
        this.#scheduleTokenTimers(connection);
      } else {
        this.#scheduleTokenRenewalRetry(connection);
      }
      return;
    }

    const announcement = connection.sentAnnouncements.get(content.message_id);
    if (announcement !== undefined) {
      connection.sentAnnouncements.delete(content.message_id);

      if (isAccepted) {
        connection.acknowledgedAnnouncement = announcement;
        this.#sendWaitingBatches();
      } else if (
        content.error_code !== AcknowledgementErrorCode.MessageNotValid
      ) {
        this.#scheduleConnectionTimer(
          connection,
          ConnectionTimer.AnnounceRetry,
          CHANNEL_CLIENT_LIMITS.retryDelayMilliseconds,
          () => this.#sendAnnouncement(connection),
        );
      }
      return;
    }

    const batch = this.#queue.takeSent(content.message_id);
    if (batch === null) return;

    if (content.result === AcknowledgementResult.Accepted)
      this.#options.onEntriesAccepted?.({
        capabilityId: batch.source.capability_id,
        entryCount: batch.entries.length,
        newEntryCount: content.new_entry_count ?? null,
      });
    else this.#handleRefusedBatch(connection, batch, content.error_code);

    this.#updateQueuedEntryCount();
  }

  /** Follows the "send again" notes of `AcknowledgementErrorCode` */
  #handleRefusedBatch(
    connection: Connection,
    batch: QueuedBatch,
    errorCode: AcknowledgementErrorCode,
  ) {
    const { source } = batch;

    switch (errorCode) {
      case AcknowledgementErrorCode.MessageNotValid:
      case AcknowledgementErrorCode.EntriesNotValid:
        this.#reportDroppedBatch(batch, ChannelDropReason.RefusedByRelay);
        break;

      // The `switches` that follow replace these lists
      case AcknowledgementErrorCode.ConnectorTurnedOff:
        this.#reportDroppedBatch(batch, ChannelDropReason.TurnedOff);
        if (!this.#state.turnedOffConnectorIds.includes(source.connector_id))
          this.#setState({
            turnedOffConnectorIds: [
              ...this.#state.turnedOffConnectorIds,
              source.connector_id,
            ],
          });
        this.#applyAccessChange();
        break;

      case AcknowledgementErrorCode.CapabilityTurnedOff:
        this.#reportDroppedBatch(batch, ChannelDropReason.TurnedOff);
        if (!this.#state.turnedOffCapabilityIds.includes(source.capability_id))
          this.#setState({
            turnedOffCapabilityIds: [
              ...this.#state.turnedOffCapabilityIds,
              source.capability_id,
            ],
          });
        this.#applyAccessChange();
        break;

      case AcknowledgementErrorCode.Stopped:
        this.#reportDroppedBatch(batch, ChannelDropReason.StoppedByOwner);
        this.#setStoppedByOwner(true);
        break;

      // The uploads wait for the `ack` of a new `announce`
      case AcknowledgementErrorCode.CapabilityNotAnnounced:
        this.#queue.returnToFront(batch);
        connection.acknowledgedAnnouncement = null;
        this.#sendAnnouncement(connection);
        break;

      case AcknowledgementErrorCode.RateLimitExceeded:
        this.#queue.returnToFront(batch);
        this.#getRateLimiter(source.capability_id).pause(
          this.#timers.now(),
          CAPABILITY_CATALOG[source.capability_id]
            .minimumUploadIntervalMilliseconds,
        );
        this.#sendWaitingBatches();
        break;

      case AcknowledgementErrorCode.TokenNotValid:
      case AcknowledgementErrorCode.InternalError:
        this.#queue.returnToFront(batch);
        this.#getRateLimiter(source.capability_id).pause(
          this.#timers.now(),
          CHANNEL_CLIENT_LIMITS.retryDelayMilliseconds,
        );
        this.#sendWaitingBatches();
        break;

      default:
        throw new Error(`Unknown error code: ${errorCode satisfies never}`);
    }
  }

  #getRateLimiter(capabilityId: CapabilityId) {
    let rateLimiter = this.#rateLimiters.get(capabilityId);
    if (rateLimiter === undefined) {
      rateLimiter = new RateLimiter(
        CAPABILITY_CATALOG[capabilityId].minimumUploadIntervalMilliseconds,
        CHANNEL_CLIENT_LIMITS.uploadBurstBatches,
      );
      this.#rateLimiters.set(capabilityId, rateLimiter);
    }
    return rateLimiter;
  }

  /**
   * Sends the waiting batches in their order, as the rate of each capability
   * permits, and schedules the next batch
   */
  #sendWaitingBatches() {
    this.#cancelUploadTimer?.();
    this.#cancelUploadTimer = null;

    const connection = this.#connection;
    const announcement = connection?.acknowledgedAnnouncement;
    if (!connection || !announcement) return;

    const now = this.#timers.now();
    const blockedCapabilityIds = new Set<CapabilityId>();
    let nextBatchAt = Number.POSITIVE_INFINITY;

    for (const batch of [...this.#queue.waitingBatches]) {
      const capabilityId = batch.source.capability_id;
      if (
        blockedCapabilityIds.has(capabilityId) ||
        !isAnnounced(announcement, batch.source)
      )
        continue;

      const rateLimiter = this.#getRateLimiter(capabilityId);
      const batchAt = rateLimiter.getNextAllowedAt();
      if (batchAt > now) {
        blockedCapabilityIds.add(capabilityId);
        nextBatchAt = Math.min(nextBatchAt, batchAt);
        continue;
      }

      rateLimiter.record(now);
      const message = createUpMessage(UpMessageType.FeedEntries, {
        ...batch.source,
        entries: batch.entries,
      });
      this.#queue.markSent(batch, message.id);
      this.#send(connection, message);
    }

    if (Number.isFinite(nextBatchAt))
      this.#cancelUploadTimer = this.#timers.schedule(() => {
        this.#cancelUploadTimer = null;
        this.#sendWaitingBatches();
      }, nextBatchAt - now);
  }
}
