import { SpanStatusCode, trace } from "@opentelemetry/api";
import {
  appendFeedEntries,
  authenticateRuntimeConnection,
  checkRuntimeHello,
  claimRuntimePresence,
  ConflictError,
  endRuntimeLease,
  findOwnFeedEntryKeys,
  ForbiddenError,
  recordFeedEntryUploadCounts,
  RemoteControlProgramErrorMessage,
  renewRuntimeLease,
  storeRuntimeAnnouncement,
  withSpan,
  type AppendFeedEntriesOutput,
  type ApplicationContext,
  type Logger,
  type OwnFeedEntryKeys,
  type OwnRuntime,
  type RuntimeConnection,
} from "@sam-monorepo/application";
import {
  AcknowledgementErrorCode,
  AcknowledgementResult,
  createDownMessage,
  DOWN_MESSAGE_PROTOCOL_VERSIONS,
  DownMessageType,
  getRefusalReasonOfProtocolVersion,
  isFeedSourceAnnounced,
  MINIMUM_RELAY_PROTOCOL_VERSION,
  parseUpMessage,
  RELAY_CLOSE_CODES,
  RELAY_LIMITS,
  RelayCloseReason,
  UP_MESSAGE_PROTOCOL_VERSIONS,
  UpMessageType,
  type AnnounceContent,
  type DownMessage,
  type UpMessage,
  type UpMessageOfType,
} from "@sam-monorepo/domain";
import { WebSocket, type RawData } from "ws";
import type { FeedEntryDelivery } from "./delivery/index.js";
import { MessageLane } from "./messageLane.js";
import {
  FeedEntryResult,
  UnexplainedCloseReason,
  UploadResult,
  type RelayMetrics,
} from "./metrics.js";
import type { ProgramSwitch } from "./programSwitch.js";
import {
  createRateLimiter,
  type OwnerRateLimits,
  type Rate,
} from "./rateLimits.js";
import {
  MILLISECONDS_PER_SECOND,
  ONE_HOUR_MILLISECONDS,
  ONE_MINUTE_MILLISECONDS,
} from "./time.js";
import { UploadCounts } from "./uploadCounts.js";

/** The times of the relay service. The tests make them shorter. */
export interface RelayTiming {
  /** The time from the start of the socket to the `welcome` */
  readonly handshakeTimeoutMilliseconds: number;
  /** The time after the expiry of the last valid token of a connection */
  readonly tokenRenewalGraceMilliseconds: number;
  /** The maximum time between two `heartbeat`s */
  readonly presenceLeaseMilliseconds: number;
  /** The relay service writes the upload counts of a connection at the latest after this time */
  readonly uploadCountPeriodMilliseconds: number;
  /** The interval of the check of the times of the open connections */
  readonly connectionCheckIntervalMilliseconds: number;
}

export const DEFAULT_RELAY_TIMING: RelayTiming = {
  handshakeTimeoutMilliseconds: RELAY_LIMITS.handshakeTimeoutMilliseconds,
  tokenRenewalGraceMilliseconds: RELAY_LIMITS.tokenRenewalGraceMilliseconds,
  presenceLeaseMilliseconds: RELAY_LIMITS.presenceLeaseMilliseconds,
  uploadCountPeriodMilliseconds: ONE_HOUR_MILLISECONDS,
  // A close for a time limit comes a maximum of 5 seconds late
  connectionCheckIntervalMilliseconds: 5_000,
};

/** The services of the relay server that each connection uses */
export interface ConnectionHub {
  readonly context: ApplicationContext;
  readonly metrics: RelayMetrics;
  readonly delivery: FeedEntryDelivery;
  readonly programSwitch: ProgramSwitch;
  readonly timing: RelayTiming;
  /** The limits of the owners and the runtimes, for all connections */
  readonly rateLimits: OwnerRateLimits;
  /**
   * The log of the events that clients without a valid token can cause: the
   * refusals, and the sockets without an authenticated runtime
   */
  readonly throttledLog: Logger;
  /** True after the request of the app to close the connections of the user */
  readonly isUserDisconnected: (userId: string) => boolean;
  /**
   * Registers the open connection of a runtime. Gives the previous open
   * connection of the same runtime of the same owner.
   */
  readonly registerOpenConnection: (
    connection: RelayConnection,
  ) => RelayConnection | undefined;
  /** Removes the connection from the broadcasts and from the internal requests */
  readonly removeConnection: (connection: RelayConnection) => void;
}

enum ConnectionPhase {
  /** The socket is open. The relay service waits for the `hello`. */
  AwaitingHello = "awaiting_hello",
  /** The relay service checks the `hello` */
  Handshake = "handshake",
  /** The relay service sent the `welcome` */
  Open = "open",
  Closed = "closed",
}

/** The standard close code of the WebSocket protocol for an unexpected condition of the server */
const INTERNAL_ERROR_CLOSE_CODE = 1011;

/** The code of the error of `ws` for a message above `maxPayload` */
const MESSAGE_TOO_LARGE_ERROR_CODE = "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH";

/**
 * The rates of the control messages of one connection. Each rate is far
 * above a correct runtime, and bounds the work for the database:
 *
 * - `heartbeat`: one each `RELAY_LIMITS.heartbeatIntervalMilliseconds`
 *   (15 seconds).
 * - `token_renewal`: one each `RELAY_LIMITS.tokenRenewalIntervalMilliseconds`,
 *   and one each 10 seconds after a refused renewal.
 * - `announce`: one after each change of the settings of the owner.
 */
const CONTROL_MESSAGE_RATES = {
  heartbeat: { intervalMilliseconds: 5_000, burstSize: 3 },
  tokenRenewal: { intervalMilliseconds: 10_000, burstSize: 3 },
  announce: { intervalMilliseconds: 1_000, burstSize: 5 },
} as const satisfies Record<string, Rate>;

/**
 * A `heartbeat` renews the lease in the database only when the last renewal
 * is older. A correct runtime sends one `heartbeat` each 15 seconds, thus
 * each of its heartbeats renews the lease, and the lease
 * (`RELAY_LIMITS.presenceLeaseMilliseconds`) stays far longer.
 */
const MINIMUM_LEASE_RENEWAL_INTERVAL_MILLISECONDS = 10_000;

const RUNTIME_ID_SPAN_ATTRIBUTE = "remote_control_program.runtime_id";

/**
 * A correct runtime has at most one `heartbeat`, one `token_renewal`, one
 * `feed_entry_keys_request` and some `announce`s waiting, and the rate limit
 * lets through a burst of `RELAY_LIMITS.uploadBurstBatches` batches. The
 * limit bounds the memory of one connection: 8 batches of the maximum size
 * are 4 MB.
 */
const MAXIMUM_WAITING_MESSAGES_PER_LANE = 8;

/** The value of the attribute `message_type` for a message that the relay service cannot read */
const MESSAGE_TYPE_NOT_VALID = "not_valid";

/**
 * Null for an error that is not a decision about the connection: a
 * temporary error of the relay service, for example of the database
 */
const getCloseReasonOfError = (error: unknown): RelayCloseReason | null => {
  if (error instanceof ForbiddenError)
    switch (error.message) {
      case RemoteControlProgramErrorMessage.ConnectionTokenNotValid:
        return RelayCloseReason.TokenNotValid;
      case RemoteControlProgramErrorMessage.ProgramTurnedOff:
        return RelayCloseReason.ProgramTurnedOff;
      // Banned, deleted, no citizen, no clearance or no permission
      default:
        return RelayCloseReason.AccessDenied;
    }

  if (
    error instanceof ConflictError &&
    error.message === RemoteControlProgramErrorMessage.TooManyRuntimes
  )
    return RelayCloseReason.TooManyRuntimes;

  return null;
};

const isTokenNotValidError = (error: unknown) =>
  error instanceof ForbiddenError &&
  error.message === RemoteControlProgramErrorMessage.ConnectionTokenNotValid;

/**
 * The reason for a first message that is not a valid `hello`. A runtime of a
 * newer protocol version can send a `hello` that this relay service cannot
 * read: it gets `protocol_version_too_new`. All other runtimes did not send
 * a valid token.
 */
const getRefusalReasonOfInvalidHello = (protocolVersion: number | null) =>
  (protocolVersion === null
    ? null
    : getRefusalReasonOfProtocolVersion(protocolVersion)) ??
  RelayCloseReason.TokenNotValid;

const toText = (data: RawData) => {
  if (Buffer.isBuffer(data)) return data.toString("utf8");
  if (Array.isArray(data)) return Buffer.concat(data).toString("utf8");
  return Buffer.from(data).toString("utf8");
};

/**
 * One WebSocket connection of a runtime (see the protocol in `protocol.ts`
 * of the domain package and `docs/remote-control-program/README.md#relay`).
 *
 * The sequence of the messages of one connection: the relay service reads
 * each message at its arrival, and then runs it in one of two lanes. Each
 * lane runs its messages one after the other, in the sequence of their
 * arrival, and the two lanes run in parallel.
 *
 * - The control lane: `heartbeat` and `token_renewal`. Thus a slow upload
 *   never delays the `ack` of a `heartbeat`, which the runtime needs within
 *   `RELAY_LIMITS.heartbeatIntervalMilliseconds`.
 * - The data lane: `announce`, `feed_entries` and
 *   `feed_entry_keys_request`, and the hourly upload counts. Thus the relay
 *   service checks each batch against the announcement that the runtime sent
 *   before the batch, stores the batches in the sequence in which the
 *   runtime sent them, and reads the keys after the batches before the
 *   request.
 *
 * The rate limits apply at the arrival of a message: a message above its
 * rate gets its `ack` at once and does not go into a lane. The limits of the
 * uploads are in the hub (`OwnerRateLimits`), thus a new connection does not
 * reset them.
 */
export class RelayConnection {
  readonly #socket: WebSocket;
  readonly #hub: ConnectionHub;
  readonly #controlLane: MessageLane;
  readonly #dataLane: MessageLane;
  readonly #heartbeatRate = createRateLimiter(CONTROL_MESSAGE_RATES.heartbeat);
  readonly #tokenRenewalRate = createRateLimiter(
    CONTROL_MESSAGE_RATES.tokenRenewal,
  );
  readonly #announceRate = createRateLimiter(CONTROL_MESSAGE_RATES.announce);
  readonly #feedEntryKeyRequestRate = createRateLimiter({
    intervalMilliseconds: RELAY_LIMITS.feedEntryKeyRequestIntervalMilliseconds,
    burstSize: RELAY_LIMITS.feedEntryKeyRequestBurstSize,
  });
  readonly #finished = Promise.withResolvers<void>();
  /** The end of the time for the `welcome` */
  readonly #handshakeTimer: ReturnType<typeof setTimeout>;
  #phase = ConnectionPhase.AwaitingHello;
  /** The running handshake. It does not reject. */
  #handshake: Promise<void> = Promise.resolve();
  /** The result of the last accepted token. Null before the authentication. */
  #runtime: RuntimeConnection | null = null;
  /**
   * The version of the `hello` after the `welcome`. The relay service reads
   * and sends only the message types of this version or older.
   */
  #protocolVersion = MINIMUM_RELAY_PROTOCOL_VERSION;
  /** The `connectedAt` of `claimRuntimePresence()`: the lease of this connection */
  #connectedAt: Date | null = null;
  /** The last announcement that the relay service stored */
  #announcement: AnnounceContent | null = null;
  #uploadCounts: UploadCounts | null = null;
  #isUploadCountRecordWaiting = false;
  #lastHeartbeatAt = 0;
  /** The time of the last write of the lease */
  #leaseRenewedAt = 0;
  /** The times of the errors of the runtime in the last minute */
  #errorTimes: number[] = [];

  constructor(socket: WebSocket, hub: ConnectionHub) {
    this.#socket = socket;
    this.#hub = hub;
    this.#handshakeTimer = setTimeout(
      () => this.#handleHandshakeTimeout(),
      hub.timing.handshakeTimeoutMilliseconds,
    );

    const logLaneError = (error: unknown) => {
      hub.context.log.error("A task of a runtime connection failed", {
        ...this.#getLogIds(),
        error,
      });
    };
    this.#controlLane = new MessageLane(
      MAXIMUM_WAITING_MESSAGES_PER_LANE,
      logLaneError,
    );
    this.#dataLane = new MessageLane(
      MAXIMUM_WAITING_MESSAGES_PER_LANE,
      logLaneError,
    );

    socket.on("message", (data, isBinary) => {
      this.#handleData(isBinary ? null : toText(data));
    });
    socket.on("error", (error) => this.#handleSocketError(error));
    socket.on("close", (code) => this.#handleSocketClose(code));
  }

  /** Resolves after the relay service wrote the counts and ended the lease */
  get finished() {
    return this.#finished.promise;
  }

  get isOpen() {
    return this.#phase === ConnectionPhase.Open;
  }

  /** Null before the authentication of the `hello` */
  get userId() {
    return this.#runtime?.userId ?? null;
  }

  /** Null before the authentication of the `hello` */
  get ownerCitizenId() {
    return this.#runtime?.citizenId ?? null;
  }

  /** Null before the authentication of the `hello` */
  get runtimeId() {
    return this.#runtime?.runtimeId ?? null;
  }

  /**
   * Sends `close` (or `refusal` in the handshake) with the reason, and closes
   * the socket with the code of the reason
   */
  close(reason: RelayCloseReason) {
    this.#closeWithReason(
      reason,
      this.#phase === ConnectionPhase.Handshake
        ? DownMessageType.Refusal
        : DownMessageType.Close,
    );
  }

  /**
   * Applies the time limits of an open connection. The relay server calls it
   * at an interval. The time limit of the handshake has its own timer.
   */
  check(now: number) {
    const { timing } = this.#hub;
    const runtime = this.#runtime;
    if (this.#phase !== ConnectionPhase.Open || runtime === null) return;

    if (
      now >
      runtime.tokenExpiresAt.getTime() + timing.tokenRenewalGraceMilliseconds
    )
      this.close(RelayCloseReason.TokenNotValid);
    else if (now - this.#lastHeartbeatAt > timing.presenceLeaseMilliseconds)
      this.close(RelayCloseReason.HeartbeatMissing);
    else if (
      this.#uploadCounts !== null &&
      now - this.#uploadCounts.periodStartedAt.getTime() >=
        timing.uploadCountPeriodMilliseconds
    )
      this.#scheduleUploadCountRecord();
  }

  #handleData(text: string | null) {
    switch (this.#phase) {
      case ConnectionPhase.AwaitingHello:
        this.#handleFirstMessage(text);
        break;

      // The runtime sends its next message after the `welcome`
      case ConnectionPhase.Handshake:
        this.#hub.metrics.messages.add(1, {
          message_type: MESSAGE_TYPE_NOT_VALID,
        });
        this.#recordError();
        break;

      case ConnectionPhase.Open:
        this.#handleMessage(text);
        break;

      case ConnectionPhase.Closed:
        break;

      default:
        throw new Error(`Unknown phase: ${this.#phase satisfies never}`);
    }
  }

  /** The socket did not get its `welcome` in time */
  #handleHandshakeTimeout() {
    switch (this.#phase) {
      case ConnectionPhase.AwaitingHello:
        this.close(RelayCloseReason.TokenNotValid);
        break;

      // The use cases of the handshake did not answer in time, for example a database that does not answer
      case ConnectionPhase.Handshake:
        this.#hub.context.log.error(
          "The handshake of a runtime took too long",
          this.#getLogIds(),
        );
        this.#closeWithInternalError();
        break;

      case ConnectionPhase.Open:
      case ConnectionPhase.Closed:
        break;

      default:
        throw new Error(`Unknown phase: ${this.#phase satisfies never}`);
    }
  }

  #handleFirstMessage(text: string | null) {
    const result = text === null ? null : parseUpMessage(text);
    if (result?.success && result.message.type === UpMessageType.Hello) {
      const hello = result.message;
      this.#hub.metrics.messages.add(1, { message_type: hello.type });
      this.#phase = ConnectionPhase.Handshake;
      this.#handshake = withSpan(
        this.#hub.context,
        "handleRuntimeHello",
        async (span) => {
          span.setAttribute(
            RUNTIME_ID_SPAN_ATTRIBUTE,
            hello.content.runtime_id,
          );
          await this.#runHandshake(hello);
        },
      ).catch((error: unknown) => {
        // The handshake handles the errors of the use cases. This is a defect of the relay service.
        this.#hub.context.log.error("The handshake of a runtime failed", {
          ...this.#getLogIds(),
          error,
        });
        this.#closeWithInternalError();
      });
      return;
    }

    this.#hub.metrics.messages.add(1, { message_type: MESSAGE_TYPE_NOT_VALID });
    this.#closeWithReason(
      getRefusalReasonOfInvalidHello(
        result === null
          ? null
          : result.success
            ? result.message.protocol_version
            : result.protocolVersion,
      ),
      DownMessageType.Refusal,
    );
  }

  async #runHandshake(hello: UpMessageOfType<UpMessageType.Hello>) {
    const { context } = this.#hub;
    const versionRefusal = getRefusalReasonOfProtocolVersion(
      hello.protocol_version,
    );
    if (versionRefusal !== null) {
      this.close(versionRefusal);
      return;
    }

    let runtime: RuntimeConnection;
    try {
      runtime = await authenticateRuntimeConnection(context, {
        token: hello.content.token,
        runtime_id: hello.content.runtime_id,
        runtime_kind: hello.content.runtime_kind,
      });
    } catch (error) {
      this.#closeAfterHandshakeError(error, hello.content.runtime_id);
      return;
    }
    if (this.#isClosed()) return;
    // From now on, the internal request "disconnect user" finds the connection
    this.#runtime = runtime;
    // The use case can read the user before a ban, and the request "disconnect user" can come before this line
    if (this.#hub.isUserDisconnected(runtime.userId)) {
      this.close(RelayCloseReason.AccessDenied);
      return;
    }
    // The runtime connects again after its delay
    if (!this.#hub.rateLimits.tryTakeHello(runtime.citizenId, Date.now())) {
      this.close(RelayCloseReason.TooManyErrors);
      return;
    }

    try {
      await checkRuntimeHello(context, runtime.actor, {
        runtime_id: runtime.runtimeId,
      });
    } catch (error) {
      this.#closeAfterHandshakeError(error, runtime.runtimeId);
      return;
    }
    // Until the claim, the handshake changes nothing of an open connection of the same runtime
    if (this.#isClosed()) return;

    let presence: OwnRuntime;
    try {
      presence = await claimRuntimePresence(context, runtime.actor, {
        runtime_id: runtime.runtimeId,
        runtime_kind: hello.content.runtime_kind,
        runtime_version: hello.content.runtime_version,
        protocol_version: hello.protocol_version,
      });
    } catch (error) {
      this.#closeAfterHandshakeError(error, runtime.runtimeId);
      return;
    }
    // Also for a connection that closed in the meantime: the cleanup ends its lease
    this.#connectedAt = presence.connectedAt;
    if (this.#isClosed()) return;

    this.#open(hello, presence);
  }

  #open(hello: UpMessageOfType<UpMessageType.Hello>, presence: OwnRuntime) {
    const { context, metrics, programSwitch } = this.#hub;

    this.#phase = ConnectionPhase.Open;
    this.#protocolVersion = hello.protocol_version;
    clearTimeout(this.#handshakeTimer);
    const now = Date.now();
    this.#lastHeartbeatAt = now;
    this.#leaseRenewedAt = now;
    this.#uploadCounts = new UploadCounts(presence.connectedAt);
    this.#hub.registerOpenConnection(this)?.close(RelayCloseReason.Replaced);
    this.#send(createDownMessage(DownMessageType.Welcome, {}));
    metrics.openConnections.add(1);
    context.log.info("Opened a runtime connection", {
      ...this.#getLogIds(),
      runtimeKind: hello.content.runtime_kind,
      runtimeVersion: hello.content.runtime_version,
      protocolVersion: hello.protocol_version,
    });

    // A change in the handshake: `checkRuntimeHello()` read the older values
    if (programSwitch.isTurnedOff())
      this.close(RelayCloseReason.ProgramTurnedOff);
  }

  #closeAfterHandshakeError(error: unknown, runtimeId: string) {
    if (this.#isClosed()) return;

    const reason = getCloseReasonOfError(error);
    if (reason !== null) {
      this.close(reason);
      return;
    }

    this.#hub.context.log.error("The handshake of a runtime failed", {
      ...this.#getLogIds(),
      runtimeId,
      error,
    });
    trace.getActiveSpan()?.setStatus({ code: SpanStatusCode.ERROR });
    this.#closeWithInternalError();
  }

  #handleMessage(text: string | null) {
    const { metrics } = this.#hub;
    const result = text === null ? null : parseUpMessage(text);
    if (!result?.success) {
      metrics.messages.add(1, { message_type: MESSAGE_TYPE_NOT_VALID });
      if (result?.messageId)
        this.#refuse(
          result.messageId,
          MESSAGE_TYPE_NOT_VALID,
          AcknowledgementErrorCode.MessageNotValid,
        );
      this.#recordError();
      return;
    }

    const { message } = result;
    metrics.messages.add(1, { message_type: message.type });
    const now = Date.now();

    // Like an unknown message type
    if (UP_MESSAGE_PROTOCOL_VERSIONS[message.type] > this.#protocolVersion) {
      this.#refuseMessage(message, AcknowledgementErrorCode.MessageNotValid);
      this.#recordError();
      return;
    }

    switch (message.type) {
      case UpMessageType.Hello:
        this.#refuseMessage(message, AcknowledgementErrorCode.MessageNotValid);
        this.#recordError();
        break;

      case UpMessageType.Heartbeat:
        this.#lastHeartbeatAt = now;
        if (this.#isWithinRate(this.#heartbeatRate.tryTake(now), message))
          this.#enqueue(this.#controlLane, message, () =>
            this.#renewLease(message),
          );
        break;

      case UpMessageType.TokenRenewal:
        if (this.#isWithinRate(this.#tokenRenewalRate.tryTake(now), message))
          this.#enqueue(this.#controlLane, message, () =>
            this.#renewToken(message),
          );
        break;

      case UpMessageType.Announce:
        if (this.#isWithinRate(this.#announceRate.tryTake(now), message))
          this.#enqueue(this.#dataLane, message, () =>
            this.#storeAnnouncement(message),
          );
        break;

      case UpMessageType.FeedEntries:
        if (this.#isUploadPermitted(message, now))
          this.#enqueue(this.#dataLane, message, () =>
            withSpan(
              this.#hub.context,
              "handleRuntimeFeedEntries",
              async (span) => {
                span.setAttribute(
                  RUNTIME_ID_SPAN_ATTRIBUTE,
                  this.#requireRuntime().runtimeId,
                );
                await this.#appendFeedEntries(message);
              },
            ),
          );
        break;

      case UpMessageType.FeedEntryKeysRequest:
        if (
          this.#isWithinRate(
            this.#feedEntryKeyRequestRate.tryTake(now),
            message,
          )
        )
          this.#enqueue(this.#dataLane, message, () =>
            withSpan(
              this.#hub.context,
              "handleRuntimeFeedEntryKeysRequest",
              async (span) => {
                span.setAttribute(
                  RUNTIME_ID_SPAN_ATTRIBUTE,
                  this.#requireRuntime().runtimeId,
                );
                await this.#sendOwnFeedEntryKeys(message);
              },
            ),
          );
        break;

      default:
        throw new Error(
          `Unknown message type: ${JSON.stringify(message satisfies never)}`,
        );
    }
  }

  /**
   * A full control lane is a defect of the runtime. A full data lane comes
   * from a slow database: the runtime sends the batch again after a pause.
   */
  #enqueue(lane: MessageLane, message: UpMessage, task: () => Promise<void>) {
    if (lane.enqueue(task)) return;

    this.#refuseMessage(message, AcknowledgementErrorCode.InternalError);
    if (lane === this.#controlLane) this.#recordError();
  }

  /**
   * Refuses a message above its rate with `rate_limit_exceeded`. The refusal
   * counts as an error: a correct runtime stays below each rate (for the
   * uploads, one batch below the burst of the relay service).
   */
  #isWithinRate(isAllowed: boolean, message: UpMessage) {
    if (isAllowed) return true;

    this.#refuseMessage(message, AcknowledgementErrorCode.RateLimitExceeded);
    this.#recordError();
    return false;
  }

  /**
   * The rate of the capability of the runtime, then the hourly budget of the
   * entries of the owner. A batch above the budget is not an error: the
   * runtime sends it again after a pause, until the budget has space.
   */
  #isUploadPermitted(
    message: UpMessageOfType<UpMessageType.FeedEntries>,
    now: number,
  ) {
    const { rateLimits, metrics } = this.#hub;
    const runtime = this.#requireRuntime();
    const batch = message.content;

    const isWithinRate = rateLimits.tryTakeUpload(
      {
        ownerCitizenId: runtime.citizenId,
        runtimeId: runtime.runtimeId,
        capabilityId: batch.capability_id,
      },
      now,
    );
    if (!this.#isWithinRate(isWithinRate, message)) return false;

    if (rateLimits.tryTakeEntries(runtime.citizenId, batch.entries.length, now))
      return true;

    metrics.uploadBudgetRefusals.add(1, {
      capability_id: batch.capability_id,
    });
    this.#refuseMessage(message, AcknowledgementErrorCode.RateLimitExceeded);
    return false;
  }

  async #renewLease(message: UpMessageOfType<UpMessageType.Heartbeat>) {
    const runtime = this.#requireRuntime();
    const now = Date.now();
    if (
      now - this.#leaseRenewedAt <
      MINIMUM_LEASE_RENEWAL_INTERVAL_MILLISECONDS
    ) {
      this.#acknowledge(message);
      return;
    }

    try {
      await renewRuntimeLease(this.#hub.context, runtime.actor, {
        runtime_id: runtime.runtimeId,
      });
      this.#leaseRenewedAt = now;
      this.#acknowledge(message);
    } catch (error) {
      this.#handleUseCaseError(error, message);
    }
  }

  /**
   * Checks the new token like the `hello`: also the ban, the citizen and the
   * permission. A token that is not valid does not close the connection: the
   * runtime tries again until the end of the grace time of its last valid
   * token (see `check()`).
   */
  async #renewToken(message: UpMessageOfType<UpMessageType.TokenRenewal>) {
    const runtime = this.#requireRuntime();

    try {
      const renewed = await authenticateRuntimeConnection(this.#hub.context, {
        token: message.content.token,
        runtime_id: runtime.runtimeId,
        runtime_kind: runtime.runtimeKind,
      });
      if (
        renewed.userId !== runtime.userId ||
        renewed.citizenId !== runtime.citizenId
      ) {
        this.#refuseTokenRenewal(message);
        return;
      }

      this.#runtime = renewed;
      this.#acknowledge(message);
    } catch (error) {
      if (isTokenNotValidError(error)) this.#refuseTokenRenewal(message);
      else this.#handleUseCaseError(error, message);
    }
  }

  #refuseTokenRenewal(message: UpMessageOfType<UpMessageType.TokenRenewal>) {
    this.#hub.context.log.info("Refused the token renewal of a runtime", {
      ...this.#getLogIds(),
    });
    this.#refuseMessage(message, AcknowledgementErrorCode.TokenNotValid);
  }

  async #storeAnnouncement(message: UpMessageOfType<UpMessageType.Announce>) {
    const runtime = this.#requireRuntime();

    try {
      await storeRuntimeAnnouncement(this.#hub.context, runtime.actor, {
        runtime_id: runtime.runtimeId,
        announcement: message.content,
      });
    } catch (error) {
      this.#handleUseCaseError(error, message);
      return;
    }

    this.#announcement = message.content;
    this.#acknowledge(message);
  }

  async #appendFeedEntries(
    message: UpMessageOfType<UpMessageType.FeedEntries>,
  ) {
    const { context, metrics, delivery } = this.#hub;
    const runtime = this.#requireRuntime();
    const batch = message.content;

    if (
      this.#announcement === null ||
      !isFeedSourceAnnounced(this.#announcement, batch)
    ) {
      this.#refuseMessage(
        message,
        AcknowledgementErrorCode.CapabilityNotAnnounced,
      );
      return;
    }

    const startedAt = performance.now();
    const recordDuration = (result: UploadResult) =>
      metrics.uploadDuration.record(
        (performance.now() - startedAt) / MILLISECONDS_PER_SECOND,
        { capability_id: batch.capability_id, result },
      );

    let output: AppendFeedEntriesOutput;
    try {
      output = await appendFeedEntries(context, runtime.actor, {
        runtime_id: runtime.runtimeId,
        batch,
      });
    } catch (error) {
      recordDuration(UploadResult.Failed);
      this.#handleUseCaseError(error, message);
      return;
    }

    const { counts } = output;
    this.#uploadCounts?.add(batch.capability_id, counts);
    for (const [result, count] of [
      [FeedEntryResult.New, counts.newEntryCount],
      [FeedEntryResult.Duplicate, counts.duplicateEntryCount],
      [FeedEntryResult.Refused, counts.refusedEntryCount],
    ] as const)
      if (count > 0)
        metrics.uploadedEntries.add(count, {
          capability_id: batch.capability_id,
          result,
        });

    if (output.result === AcknowledgementResult.Refused) {
      recordDuration(UploadResult.Refused);
      this.#refuseMessage(message, output.errorCode);
      if (
        output.errorCode === AcknowledgementErrorCode.MessageNotValid ||
        output.errorCode === AcknowledgementErrorCode.EntriesNotValid
      )
        this.#recordError();
      return;
    }

    recordDuration(UploadResult.Accepted);
    this.#acknowledge(message, counts.newEntryCount);
    // Also after a close in the meantime: the entries are stored
    if (output.newEntries.length > 0)
      delivery.deliver({
        ownerCitizenId: runtime.citizenId,
        capabilityId: batch.capability_id,
        entries: output.newEntries,
      });
  }

  /**
   * Answers with `feed_entry_keys` instead of an `ack`. The actor of the
   * connection is the owner, thus the keys are only the own keys.
   */
  async #sendOwnFeedEntryKeys(
    message: UpMessageOfType<UpMessageType.FeedEntryKeysRequest>,
  ) {
    const runtime = this.#requireRuntime();
    const { start, end, page_cursor } = message.content;

    let page: OwnFeedEntryKeys;
    try {
      page = await findOwnFeedEntryKeys(this.#hub.context, runtime.actor, {
        start: start === undefined ? undefined : new Date(start),
        end: end === undefined ? undefined : new Date(end),
        page_cursor,
      });
    } catch (error) {
      this.#handleUseCaseError(error, message);
      return;
    }

    this.#send(
      createDownMessage(DownMessageType.FeedEntryKeys, {
        message_id: message.id,
        keys: page.keys,
        next_page_cursor: page.nextPageCursor,
      }),
    );
  }

  /**
   * A decision of a use case about the connection closes it, for example
   * `access_denied` after a lost permission. A different error is temporary:
   * the runtime sends the message again.
   */
  #handleUseCaseError(error: unknown, message: UpMessage) {
    const reason = getCloseReasonOfError(error);
    if (reason !== null) {
      this.close(reason);
      return;
    }

    this.#hub.context.log.error("A message of a runtime failed", {
      ...this.#getLogIds(),
      messageType: message.type,
      error,
    });
    trace.getActiveSpan()?.setStatus({ code: SpanStatusCode.ERROR });
    this.#refuseMessage(message, AcknowledgementErrorCode.InternalError);
  }

  #scheduleUploadCountRecord() {
    if (this.#isUploadCountRecordWaiting) return;

    // In the data lane, after the uploads of the period
    this.#isUploadCountRecordWaiting = this.#dataLane.enqueue(async () => {
      this.#isUploadCountRecordWaiting = false;
      await this.#recordUploadCounts();
    });
  }

  /** Writes the counts of the current period and starts the next period */
  async #recordUploadCounts() {
    const runtime = this.#runtime;
    if (runtime === null || this.#uploadCounts === null) return;

    const period = this.#uploadCounts.takePeriod(new Date());
    for (const [capabilityId, counts] of period.countsByCapability)
      try {
        await recordFeedEntryUploadCounts(this.#hub.context, runtime.actor, {
          runtime_id: runtime.runtimeId,
          capability_id: capabilityId,
          counts,
          period_started_at: period.startedAt,
          period_ended_at: period.endedAt,
        });
      } catch (error) {
        this.#hub.context.log.error("Failed to record the upload counts", {
          ...this.#getLogIds(),
          capabilityId,
          error,
        });
      }
  }

  /** More than `RELAY_LIMITS.maximumErrorsPerMinute` errors close the connection */
  #recordError() {
    const now = Date.now();
    this.#errorTimes = this.#errorTimes.filter(
      (time) => now - time < ONE_MINUTE_MILLISECONDS,
    );
    this.#errorTimes.push(now);

    if (this.#errorTimes.length > RELAY_LIMITS.maximumErrorsPerMinute)
      this.close(RelayCloseReason.TooManyErrors);
  }

  #acknowledge(message: UpMessage, newEntryCount?: number) {
    this.#send(
      createDownMessage(DownMessageType.Acknowledgement, {
        message_id: message.id,
        result: AcknowledgementResult.Accepted,
        ...(newEntryCount !== undefined && { new_entry_count: newEntryCount }),
      }),
    );
  }

  #refuseMessage(message: UpMessage, errorCode: AcknowledgementErrorCode) {
    this.#refuse(message.id, message.type, errorCode);
  }

  #refuse(
    messageId: string,
    messageType: string,
    errorCode: AcknowledgementErrorCode,
  ) {
    this.#hub.metrics.refusedMessages.add(1, {
      message_type: messageType,
      error_code: errorCode,
    });
    this.#send(
      createDownMessage(DownMessageType.Acknowledgement, {
        message_id: messageId,
        result: AcknowledgementResult.Refused,
        error_code: errorCode,
      }),
    );
  }

  #send(message: DownMessage) {
    // A runtime of an older version cannot read the message
    if (DOWN_MESSAGE_PROTOCOL_VERSIONS[message.type] > this.#protocolVersion)
      throw new Error(
        `The message type ${message.type} is newer than the protocol version of the connection`,
      );

    if (this.#socket.readyState === WebSocket.OPEN)
      this.#socket.send(JSON.stringify(message));
  }

  #closeWithReason(
    reason: RelayCloseReason,
    messageType: DownMessageType.Refusal | DownMessageType.Close,
  ) {
    if (this.#isClosed()) return;

    const { context, metrics } = this.#hub;
    const isRefusal = messageType === DownMessageType.Refusal;
    this.#send(
      isRefusal
        ? createDownMessage(DownMessageType.Refusal, { reason })
        : createDownMessage(DownMessageType.Close, { reason }),
    );
    this.#socket.close(RELAY_CLOSE_CODES[reason], reason);

    (isRefusal ? metrics.refusals : metrics.closes).add(1, { reason });
    (isRefusal ? this.#hub.throttledLog : this.#getLog()).info(
      isRefusal
        ? "Refused a runtime connection"
        : "Closed a runtime connection",
      { ...this.#getLogIds(), reason },
    );
    this.#end();
  }

  /** The runtime connects again after a delay (see `shouldReconnectAfterClose`) */
  #closeWithInternalError() {
    if (this.#isClosed()) return;

    this.#socket.close(INTERNAL_ERROR_CLOSE_CODE);
    this.#hub.metrics.closes.add(1, {
      reason: UnexplainedCloseReason.InternalError,
    });
    this.#end();
  }

  /** `ws` closes the socket after the error */
  #handleSocketError(error: Error) {
    if (this.#isClosed()) return;

    const code = "code" in error ? String(error.code) : undefined;
    const reason =
      code === MESSAGE_TOO_LARGE_ERROR_CODE
        ? UnexplainedCloseReason.MessageTooLarge
        : UnexplainedCloseReason.ProtocolError;
    this.#hub.metrics.closes.add(1, { reason });
    this.#getLog().warn("A runtime connection failed", {
      ...this.#getLogIds(),
      reason,
      errorCode: code,
    });
    this.#end();
  }

  #handleSocketClose(code: number) {
    if (this.#isClosed()) return;

    this.#hub.metrics.closes.add(1, {
      reason: UnexplainedCloseReason.ClosedByRuntime,
    });
    this.#getLog().info("The runtime closed its connection", {
      ...this.#getLogIds(),
      code,
    });
    this.#end();
  }

  #end() {
    const wasOpen = this.#phase === ConnectionPhase.Open;
    this.#phase = ConnectionPhase.Closed;
    clearTimeout(this.#handshakeTimer);
    this.#hub.removeConnection(this);

    this.#cleanUp(wasOpen)
      .catch((error: unknown) => {
        this.#hub.context.log.error(
          "The cleanup of a runtime connection failed",
          {
            ...this.#getLogIds(),
            error,
          },
        );
      })
      .finally(() => this.#finished.resolve());
  }

  /** Writes the upload counts and ends the lease, after the running messages */
  async #cleanUp(wasOpen: boolean) {
    await this.#handshake;
    await Promise.all([this.#controlLane.stop(), this.#dataLane.stop()]);

    const runtime = this.#runtime;
    const connectedAt = this.#connectedAt;
    if (runtime !== null && connectedAt !== null) {
      await this.#recordUploadCounts();

      try {
        await endRuntimeLease(this.#hub.context, runtime.actor, {
          runtime_id: runtime.runtimeId,
          connected_at: connectedAt,
        });
      } catch (error) {
        this.#hub.context.log.error("Failed to end the lease of a runtime", {
          ...this.#getLogIds(),
          error,
        });
      }
    }

    if (wasOpen) this.#hub.metrics.openConnections.add(-1);
  }

  /** A method, thus TypeScript does not keep the narrowed phase across an `await` */
  #isClosed() {
    return this.#phase === ConnectionPhase.Closed;
  }

  /** For the handlers of the messages after the `welcome` */
  #requireRuntime() {
    if (this.#runtime === null)
      throw new Error("The connection has no authenticated runtime");

    return this.#runtime;
  }

  /** A socket without an authenticated runtime can come from a client without a valid token */
  #getLog() {
    return this.#runtime === null
      ? this.#hub.throttledLog
      : this.#hub.context.log;
  }

  /** The ids of the user, the citizen and the runtime. Never a token. */
  #getLogIds() {
    const runtime = this.#runtime;
    return runtime === null
      ? {}
      : {
          userId: runtime.userId,
          citizenId: runtime.citizenId,
          runtimeId: runtime.runtimeId,
        };
  }
}
