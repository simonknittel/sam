import {
  AcknowledgementErrorCode,
  AcknowledgementResult,
  CAPABILITY_CATALOG,
  DownMessageType,
  RELAY_LIMITS,
  RateLimiter,
  RelayCloseReason,
  UpMessageType,
  getRelayCloseReasonOfCode,
  isFeedSourceAnnounced,
  parseDownMessage,
  shouldReconnectAfterClose,
  type AnnounceContent,
  type CapabilityId,
  type DownMessageOfType,
  type FeedEntriesContent,
  type FeedEntriesSource,
  type UpMessage,
} from "@sam-monorepo/domain";
import { CHANNEL_CLIENT_LIMITS } from "./channelLimits.js";
import { createChannelMessage } from "./channelProtocol.js";
import {
  ChannelDropReason,
  ChannelEndReason,
  ChannelStatus,
  ConnectionTokenRefusedError,
  DEFAULT_TIMERS,
  INITIAL_CHANNEL_STATE,
  isProgramTurnedOff,
  type ChannelClientOptions,
  type ChannelCloseReason,
  type ChannelState,
  type ChannelStateListener,
  type ChannelTimers,
  type ChannelWebSocket,
  type ConnectionTokenGrant,
  type CreateChannelWebSocket,
  type FeedEntry,
} from "./channelTypes.js";
import { getReconnectDelayMilliseconds } from "./reconnectDelay.js";
import { UploadQueue, type QueuedBatch } from "./uploadQueue.js";

const createBrowserWebSocket: CreateChannelWebSocket = (url, handlers) => {
  const socket = new WebSocket(url);
  socket.addEventListener("open", () => handlers.onOpen());
  socket.addEventListener("message", (event) => handlers.onMessage(event.data));
  socket.addEventListener("close", (event) => handlers.onClose(event.code));
  return socket;
};

const CHANNEL_END_REASONS = new Set<ChannelCloseReason | null>(
  Object.values(ChannelEndReason),
);

const isChannelEndReason = (
  reason: ChannelCloseReason | null,
): reason is ChannelEndReason => CHANNEL_END_REASONS.has(reason);

/** The client connects again after a close for this reason */
const shouldReconnect = (reason: ChannelCloseReason | null) =>
  !isChannelEndReason(reason) && shouldReconnectAfterClose(reason);

/** The runtime makes each announcement in the same way */
const isSameAnnouncement = (first: AnnounceContent, second: AnnounceContent) =>
  JSON.stringify(first) === JSON.stringify(second);

const keepAllEntries = (
  _source: FeedEntriesSource,
  entries: readonly FeedEntry[],
) => entries;

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
  /**
   * The `announce` without an `ack`. The client sends one at a time, and
   * after its `ack` the newest announcement when it is different.
   */
  pendingAnnouncement: {
    readonly messageId: string;
    readonly content: AnnounceContent;
  } | null;
  /** The client sends batches only for the parts of this announcement */
  acknowledgedAnnouncement: AnnounceContent | null;
  readonly cancelTimers: Map<ConnectionTimer, () => void>;
  readonly tokenRequests: Set<AbortController>;
}

/**
 * The channel client: the WebSocket client of a runtime for the protocol of
 * the relay service (see `protocol.ts` of the domain package). It does the
 * handshake and the announcement, sends the heartbeats, renews the token,
 * uploads the feed entries until their `ack`, connects again after a lost
 * connection, and obeys the switches and the local access layer.
 */
export class ChannelClient {
  readonly #options: ChannelClientOptions;
  readonly #timers: ChannelTimers;
  readonly #random: () => number;
  readonly #createWebSocket: CreateChannelWebSocket;
  readonly #selectPermittedEntries: NonNullable<
    ChannelClientOptions["selectPermittedEntries"]
  >;
  readonly #queue = new UploadQueue(CHANNEL_CLIENT_LIMITS.maximumQueuedEntries);
  readonly #rateLimiters = new Map<CapabilityId, RateLimiter>();
  readonly #listeners = new Set<ChannelStateListener>();
  #announcement: AnnounceContent;
  #state: ChannelState = INITIAL_CHANNEL_STATE;
  #connection: Connection | null = null;
  #failedAttemptCount = 0;
  #cancelReconnect: (() => void) | null = null;
  #cancelUploadTimer: (() => void) | null = null;

  constructor(options: ChannelClientOptions) {
    this.#options = options;
    this.#timers = options.timers ?? DEFAULT_TIMERS;
    this.#random = options.random ?? Math.random;
    this.#createWebSocket = options.createWebSocket ?? createBrowserWebSocket;
    this.#selectPermittedEntries =
      options.selectPermittedEntries ?? keepAllEntries;
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
   * After a change of the local access layer: the client removes the waiting
   * entries that the local access layer does not permit any more, and sends
   * the announcement to the relay when its content changed.
   */
  updateAnnouncement(announcement: AnnounceContent) {
    const isChanged = !isSameAnnouncement(announcement, this.#announcement);
    this.#announcement = announcement;
    this.#applyAccessChange();

    const connection = this.#connection;
    if (isChanged && connection?.isWelcomed) this.#sendAnnouncement(connection);
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
   * The client does not upload while the Remote Control Program is off. It
   * removes the entries and does not keep them for later: an automatic upload
   * after the program is on again would send entries of a time in which the
   * program was off. The lines stay in the log file on the machine, and only
   * an explicit request of the owner sends older entries (decision 27 and
   * "Switches" of the concept).
   */
  #getDropReason(source: FeedEntriesSource) {
    if (isProgramTurnedOff(this.#state)) return ChannelDropReason.TurnedOff;

    // All is off by default (principle 2): a capability without a rule does
    // not upload
    const { capability_rules: rules } = this.#announcement.local_access_layer;
    const isCapabilityOn = rules.some(
      (rule) => rule.capability_id === source.capability_id && rule.is_on,
    );

    return isCapabilityOn ? null : ChannelDropReason.LocalAccessLayer;
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

  /**
   * Removes the entries of the batch that the local access layer does not
   * permit now (`selectPermittedEntries`). False when no entry stays.
   */
  #keepPermittedEntries(batch: QueuedBatch) {
    const permittedEntries = this.#selectPermittedEntries(
      batch.source,
      batch.entries,
    );
    const removedCount = batch.entries.length - permittedEntries.length;
    if (removedCount > 0) {
      this.#queue.keepEntries(batch, permittedEntries);
      this.#reportDropped(
        batch.source.capability_id,
        removedCount,
        ChannelDropReason.LocalAccessLayer,
      );
    }

    return permittedEntries.length > 0;
  }

  /** After a change of the connection or of the local access layer */
  #applyAccessChange() {
    const droppedBatches = this.#queue.removeWaiting(
      (batch) => this.#getDropReason(batch.source) !== null,
    );
    for (const batch of droppedBatches) {
      const reason = this.#getDropReason(batch.source);
      if (reason !== null) this.#reportDroppedBatch(batch, reason);
    }
    for (const batch of [...this.#queue.waitingBatches])
      this.#keepPermittedEntries(batch);

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
      pendingAnnouncement: null,
      acknowledgedAnnouncement: null,
      cancelTimers: new Map(),
      tokenRequests: new Set(),
    };
    this.#connection = connection;
    this.#setState({ status: ChannelStatus.Connecting });

    void this.#openConnection(connection);
  }

  async #openConnection(connection: Connection) {
    let grant: ConnectionTokenGrant;
    try {
      grant = await this.#requestToken(connection);
    } catch (error) {
      this.#endConnection(
        connection,
        error instanceof ConnectionTokenRefusedError ? error.reason : null,
      );
      return;
    }
    if (this.#connection !== connection) return;

    const { token, relayUrl } = grant;
    if (relayUrl === null) {
      this.#endConnection(connection, ChannelEndReason.NoRelay);
      return;
    }

    try {
      connection.socket = this.#createWebSocket(relayUrl, {
        onOpen: () => {
          if (this.#connection !== connection) return;

          this.#send(
            connection,
            createChannelMessage(UpMessageType.Hello, {
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
    // resend is safe. The local access layer applies again before it.
    this.#queue.returnSent();
  }

  /** @param reason Null for a close without a reason of the relay */
  #endConnection(connection: Connection, reason: ChannelCloseReason | null) {
    if (this.#connection !== connection) return;

    this.#closeConnection(connection);

    if (shouldReconnect(reason)) {
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
        this.#handleWelcome(connection);
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

      // A type of a newer protocol version than `CHANNEL_PROTOCOL_VERSION`,
      // which the relay does not send to this client
      case DownMessageType.FeedEntryKeys:
        break;

      default:
        throw new Error(
          `Unknown message type: ${JSON.stringify(message satisfies never)}`,
        );
    }
  }

  #handleWelcome(connection: Connection) {
    if (connection.isWelcomed) return;

    connection.isWelcomed = true;
    this.#cancelConnectionTimer(connection, ConnectionTimer.Handshake);
    this.#scheduleHeartbeat(connection);
    this.#scheduleTokenTimers(connection);
    this.#sendAnnouncement(connection);

    this.#setState({
      status: ChannelStatus.Connected,
      closeReason: null,
    });
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

        const heartbeat = createChannelMessage(UpMessageType.Heartbeat, {});
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
      ({ token } = await this.#requestToken(connection));
    } catch (error) {
      if (this.#connection !== connection) return;

      if (error instanceof ConnectionTokenRefusedError)
        this.#endConnection(connection, error.reason);
      else this.#scheduleTokenRenewalRetry(connection);
      return;
    }
    if (this.#connection !== connection) return;

    const message = createChannelMessage(UpMessageType.TokenRenewal, { token });
    connection.renewal = { messageId: message.id, requestedAt };
    this.#send(connection, message);
  }

  /**
   * Sends the newest announcement. While an `announce` waits for its `ack`,
   * the `ack` sends the newest announcement. Thus many quick changes send
   * few messages, and the relay does not count them as errors of its rate
   * limit.
   */
  #sendAnnouncement(connection: Connection) {
    if (connection.pendingAnnouncement !== null) return;
    this.#cancelConnectionTimer(connection, ConnectionTimer.AnnounceRetry);

    const message = createChannelMessage(
      UpMessageType.Announce,
      this.#announcement,
    );
    connection.pendingAnnouncement = {
      messageId: message.id,
      content: message.content,
    };
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

    const { pendingAnnouncement } = connection;
    if (content.message_id === pendingAnnouncement?.messageId) {
      connection.pendingAnnouncement = null;

      if (isAccepted) {
        connection.acknowledgedAnnouncement = pendingAnnouncement.content;
        if (
          !isSameAnnouncement(pendingAnnouncement.content, this.#announcement)
        )
          this.#sendAnnouncement(connection);
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
        !isFeedSourceAnnounced(announcement, batch.source)
      )
        continue;

      const rateLimiter = this.#getRateLimiter(capabilityId);
      const batchAt = rateLimiter.getNextAllowedAt();
      if (batchAt > now) {
        blockedCapabilityIds.add(capabilityId);
        nextBatchAt = Math.min(nextBatchAt, batchAt);
        continue;
      }

      if (!this.#keepPermittedEntries(batch)) continue;

      rateLimiter.record(now);
      const message = createChannelMessage(UpMessageType.FeedEntries, {
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
    // Last: the listeners can send new entries
    this.#updateQueuedEntryCount();
  }
}
