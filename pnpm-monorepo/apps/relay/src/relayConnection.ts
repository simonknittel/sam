import { SpanStatusCode, trace, type Span } from "@opentelemetry/api";
import {
  announceRuntime,
  appendFeedEntries,
  authenticateRuntimeConnection,
  ConflictError,
  endRuntimeLease,
  ForbiddenError,
  getOwnRuntimeStop,
  recordFeedEntryUploadCounts,
  RemoteControlProgramErrorMessage,
  renewRuntimeLease,
  storeRuntimeAnnouncement,
  type Actor,
  type AnnounceRuntimeOutput,
  type AppendFeedEntriesOutput,
  type ApplicationContext,
  type RuntimeConnection,
} from "@sam-monorepo/application";
import {
  AcknowledgementErrorCode,
  AcknowledgementResult,
  CAPABILITY_CATALOG,
  createDownMessage,
  DownMessageType,
  getRefusalReasonOfProtocolVersion,
  parseUpMessage,
  RELAY_CLOSE_CODES,
  RELAY_LIMITS,
  RelayCloseReason,
  UpMessageType,
  type AnnounceContent,
  type CapabilityId,
  type DownMessage,
  type FeedEntriesContent,
  type RemoteControlProgramSwitches,
  type UpMessage,
  type UpMessageOfType,
} from "@sam-monorepo/domain";
import { WebSocket, type RawData } from "ws";
import * as z from "zod";
import type { FeedEntryDelivery } from "./delivery/index.js";
import { MessageLane } from "./messageLane.js";
import {
  FeedEntryResult,
  UnexplainedCloseReason,
  UploadResult,
  type RelayMetrics,
} from "./metrics.js";
import type { SwitchesSource } from "./switches.js";
import { UploadCounts } from "./uploadCounts.js";
import { UploadRateLimiter } from "./uploadRateLimiter.js";

/** The times of the relay service. The tests make them shorter. */
export interface RelayTiming {
  /**
   * The time from the start of the socket to the `hello` and to the end of
   * the handshake
   */
  readonly handshakeTimeoutMilliseconds: number;
  /** The time after the expiry of the last valid token of a connection */
  readonly tokenRenewalGraceMilliseconds: number;
  /** The maximum time between two `heartbeat`s */
  readonly presenceLeaseMilliseconds: number;
  /** The relay service writes the upload counts of a connection at the latest after this time */
  readonly uploadCountPeriodMilliseconds: number;
  /** The interval of the check of the times of all connections */
  readonly connectionCheckIntervalMilliseconds: number;
}

const ONE_HOUR_MILLISECONDS = 60 * 60 * 1_000;

export const DEFAULT_RELAY_TIMING: RelayTiming = {
  handshakeTimeoutMilliseconds: RELAY_LIMITS.tokenRenewalGraceMilliseconds,
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
  readonly switches: SwitchesSource;
  readonly timing: RelayTiming;
  /** Increases with each request of the app about a changed stop of an owner */
  readonly getOwnerStopChangeCount: () => number;
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

const ONE_MINUTE_MILLISECONDS = 60_000;

/**
 * A correct runtime has at most one `heartbeat`, one `token_renewal` and some
 * `announce`s waiting, and the rate limit lets through a burst of
 * `RELAY_LIMITS.uploadBurstBatches` batches. The limit bounds the memory of
 * one connection: 8 batches of the maximum size are 4 MB.
 */
const MAXIMUM_WAITING_MESSAGES_PER_LANE = 8;

/** The value of the attribute `message_type` for a message that the relay service cannot read */
const MESSAGE_TYPE_NOT_VALID = "not_valid";

const MILLISECONDS_PER_SECOND = 1_000;

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

const protocolVersionSchema = z.object({ protocol_version: z.number() });

/**
 * The reason for a first message that is not a valid `hello`. A runtime of a
 * newer protocol version can send a `hello` that this relay service cannot
 * read: it gets `protocol_version_too_new`. All other runtimes did not send
 * a valid token.
 */
const getRefusalReasonOfInvalidHello = (text: string | null) => {
  if (text === null) return RelayCloseReason.TokenNotValid;

  try {
    const envelope = protocolVersionSchema.safeParse(JSON.parse(text));
    const reason = envelope.success
      ? getRefusalReasonOfProtocolVersion(envelope.data.protocol_version)
      : null;
    return reason ?? RelayCloseReason.TokenNotValid;
  } catch {
    return RelayCloseReason.TokenNotValid;
  }
};

const toText = (data: RawData) => {
  if (Buffer.isBuffer(data)) return data.toString("utf8");
  if (Array.isArray(data)) return Buffer.concat(data).toString("utf8");
  return Buffer.from(data).toString("utf8");
};

/** The connector, the capability and both versions are in the announcement */
const isAnnounced = (
  announcement: AnnounceContent | null,
  batch: FeedEntriesContent,
) =>
  announcement?.connectors.some(
    (connector) =>
      connector.id === batch.connector_id &&
      connector.version === batch.connector_version &&
      connector.capabilities.some(
        (capability) =>
          capability.id === batch.capability_id &&
          capability.version === batch.capability_version,
      ),
  ) ?? false;

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
 * - The data lane: `announce` and `feed_entries`, and the hourly upload
 *   counts. Thus the relay service checks each batch against the
 *   announcement that the runtime sent before the batch, and stores the
 *   batches in the sequence in which the runtime sent them.
 *
 * The rate limit of the uploads applies at the arrival of a batch: a batch
 * above the rate gets its `ack` at once and does not go into the data lane.
 */
export class RelayConnection {
  readonly #socket: WebSocket;
  readonly #hub: ConnectionHub;
  readonly #openedAt = Date.now();
  readonly #controlLane: MessageLane;
  readonly #dataLane: MessageLane;
  readonly #rateLimiters = new Map<CapabilityId, UploadRateLimiter>();
  readonly #finished = Promise.withResolvers<void>();
  #phase = ConnectionPhase.AwaitingHello;
  /** The running handshake. It does not reject. */
  #handshake: Promise<void> = Promise.resolve();
  /** The result of the last accepted token. Null before the authentication. */
  #runtime: RuntimeConnection | null = null;
  /** The `connectedAt` of `announceRuntime()`: the lease of this connection */
  #connectedAt: Date | null = null;
  /** The last announcement that the relay service stored */
  #announcement: AnnounceContent | null = null;
  #uploadCounts: UploadCounts | null = null;
  #isUploadCountRecordWaiting = false;
  #lastHeartbeatAt = 0;
  /** The times of the errors of the runtime in the last minute */
  #errorTimes: number[] = [];

  constructor(socket: WebSocket, hub: ConnectionHub) {
    this.#socket = socket;
    this.#hub = hub;

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

  /** The actor of the last accepted token. Null before the authentication. */
  get actor(): Actor | null {
    return this.#runtime?.actor ?? null;
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

  /** Applies the time limits. The relay server calls it at an interval. */
  check(now: number) {
    const { timing } = this.#hub;

    switch (this.#phase) {
      case ConnectionPhase.AwaitingHello:
        if (now - this.#openedAt > timing.handshakeTimeoutMilliseconds)
          this.close(RelayCloseReason.TokenNotValid);
        break;

      case ConnectionPhase.Handshake:
        // The use cases of the handshake did not answer in time, for example a database that does not answer
        if (now - this.#openedAt > timing.handshakeTimeoutMilliseconds) {
          this.#hub.context.log.error(
            "The handshake of a runtime took too long",
            {
              ...this.#getLogIds(),
            },
          );
          this.#closeWithInternalError();
        }
        break;

      case ConnectionPhase.Open:
        if (
          this.#runtime !== null &&
          now >
            this.#runtime.tokenExpiresAt.getTime() +
              timing.tokenRenewalGraceMilliseconds
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
        break;

      case ConnectionPhase.Closed:
        break;

      default:
        throw new Error(`Unknown phase: ${this.#phase satisfies never}`);
    }
  }

  /**
   * Sends the switches, with only the parts that the runtime announced (see
   * `protocol.ts`). Nothing before the first `announce`: the `ack` of the
   * `announce` brings the switches.
   */
  sendSwitches(switches: RemoteControlProgramSwitches) {
    const announcement = this.#announcement;
    if (this.#phase !== ConnectionPhase.Open || announcement === null) return;

    const announcedConnectorIds = new Set(
      announcement.connectors.map((connector) => connector.id),
    );
    const announcedCapabilityIds = new Set(
      announcement.connectors.flatMap((connector) =>
        connector.capabilities.map((capability) => capability.id),
      ),
    );

    this.#send(
      createDownMessage(DownMessageType.Switches, {
        turned_off_connectors: switches.turnedOffConnectorIds.filter(
          (connectorId) => announcedConnectorIds.has(connectorId),
        ),
        turned_off_capabilities: switches.turnedOffCapabilityIds.filter(
          (capabilityId) => announcedCapabilityIds.has(capabilityId),
        ),
      }),
    );
  }

  /** Sends `stop` or `start` (the "Stop all" of the owner) */
  sendOwnerStop(isStopped: boolean) {
    if (this.#phase !== ConnectionPhase.Open) return;

    this.#send(
      isStopped
        ? createDownMessage(DownMessageType.Stop, {})
        : createDownMessage(DownMessageType.Start, {}),
    );
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

  #handleFirstMessage(text: string | null) {
    const result = text === null ? null : parseUpMessage(text);
    if (result?.success && result.message.type === UpMessageType.Hello) {
      const hello = result.message;
      this.#hub.metrics.messages.add(1, { message_type: hello.type });
      this.#phase = ConnectionPhase.Handshake;
      this.#handshake = this.#runInSpan(
        "handleRuntimeHello",
        hello.content.runtime_id,
        () => this.#runHandshake(hello),
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
      getRefusalReasonOfInvalidHello(text),
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
      });
    } catch (error) {
      this.#closeAfterHandshakeError(error, hello.content.runtime_id);
      return;
    }
    if (this.#isClosed()) return;
    // From now on, the internal request "disconnect user" finds the connection
    this.#runtime = runtime;

    const ownerStopChangeCount = this.#hub.getOwnerStopChangeCount();
    let announced: AnnounceRuntimeOutput;
    try {
      announced = await announceRuntime(context, runtime.actor, {
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
    this.#connectedAt = announced.runtime.connectedAt;
    if (this.#isClosed()) return;

    this.#open(hello, announced, ownerStopChangeCount);
  }

  #open(
    hello: UpMessageOfType<UpMessageType.Hello>,
    announced: AnnounceRuntimeOutput,
    ownerStopChangeCount: number,
  ) {
    const { context, metrics, switches } = this.#hub;

    this.#phase = ConnectionPhase.Open;
    this.#lastHeartbeatAt = Date.now();
    this.#uploadCounts = new UploadCounts(announced.runtime.connectedAt);
    this.#hub.registerOpenConnection(this)?.close(RelayCloseReason.Replaced);
    this.#send(
      createDownMessage(DownMessageType.Welcome, {
        is_stopped: announced.isOwnerStopped,
      }),
    );
    metrics.openConnections.add(1);
    context.log.info("Opened a runtime connection", {
      ...this.#getLogIds(),
      runtimeKind: hello.content.runtime_kind,
      runtimeVersion: hello.content.runtime_version,
      protocolVersion: hello.protocol_version,
    });

    // A change in the handshake: `announceRuntime()` read the older values
    if (switches.getSwitches().isProgramTurnedOff) {
      this.close(RelayCloseReason.ProgramTurnedOff);
      return;
    }
    if (this.#hub.getOwnerStopChangeCount() !== ownerStopChangeCount)
      this.#controlLane.enqueue(() => this.#sendCurrentOwnerStop());
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

  async #sendCurrentOwnerStop() {
    const runtime = this.#requireRuntime();

    try {
      const { stoppedAt } = await getOwnRuntimeStop(
        this.#hub.context,
        runtime.actor,
      );
      this.sendOwnerStop(stoppedAt !== null);
    } catch (error) {
      this.#hub.context.log.error("Failed to read the stop of an owner", {
        ...this.#getLogIds(),
        error,
      });
    }
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

    switch (message.type) {
      case UpMessageType.Hello:
        this.#refuseMessage(message, AcknowledgementErrorCode.MessageNotValid);
        this.#recordError();
        break;

      case UpMessageType.Heartbeat:
        this.#lastHeartbeatAt = Date.now();
        this.#enqueue(this.#controlLane, message, () =>
          this.#renewLease(message),
        );
        break;

      case UpMessageType.TokenRenewal:
        this.#enqueue(this.#controlLane, message, () =>
          this.#renewToken(message),
        );
        break;

      case UpMessageType.Announce:
        this.#enqueue(this.#dataLane, message, () =>
          this.#storeAnnouncement(message),
        );
        break;

      case UpMessageType.FeedEntries:
        if (!this.#takeUploadSlot(message.content.capability_id)) {
          this.#refuseMessage(
            message,
            AcknowledgementErrorCode.RateLimitExceeded,
          );
          // A correct runtime stays one batch below the burst of the relay service
          this.#recordError();
          break;
        }
        this.#enqueue(this.#dataLane, message, () =>
          this.#runInSpan(
            "handleRuntimeFeedEntries",
            this.#requireRuntime().runtimeId,
            () => this.#appendFeedEntries(message),
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

  #takeUploadSlot(capabilityId: CapabilityId) {
    let rateLimiter = this.#rateLimiters.get(capabilityId);
    if (rateLimiter === undefined) {
      rateLimiter = new UploadRateLimiter(
        CAPABILITY_CATALOG[capabilityId].minimumUploadIntervalMilliseconds,
        RELAY_LIMITS.uploadBurstBatches,
      );
      this.#rateLimiters.set(capabilityId, rateLimiter);
    }

    return rateLimiter.tryTake(Date.now());
  }

  async #renewLease(message: UpMessageOfType<UpMessageType.Heartbeat>) {
    const runtime = this.#requireRuntime();

    try {
      await renewRuntimeLease(this.#hub.context, runtime.actor, {
        runtime_id: runtime.runtimeId,
      });
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
    this.sendSwitches(this.#hub.switches.getSwitches());
  }

  async #appendFeedEntries(
    message: UpMessageOfType<UpMessageType.FeedEntries>,
  ) {
    const { context, metrics, delivery } = this.#hub;
    const runtime = this.#requireRuntime();
    const batch = message.content;

    if (!isAnnounced(this.#announcement, batch)) {
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
          new_entry_count: counts.newEntryCount,
          duplicate_entry_count: counts.duplicateEntryCount,
          refused_entry_count: counts.refusedEntryCount,
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
    context.log.info(
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
    this.#hub.context.log.warn("A runtime connection failed", {
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
    this.#hub.context.log.info("The runtime closed its connection", {
      ...this.#getLogIds(),
      code,
    });
    this.#end();
  }

  #end() {
    const wasOpen = this.#phase === ConnectionPhase.Open;
    this.#phase = ConnectionPhase.Closed;
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

  /** A span for the work of one message. The use cases add their own spans in it. */
  #runInSpan(name: string, runtimeId: string, callback: () => Promise<void>) {
    return this.#hub.context.tracer.startActiveSpan(
      name,
      { attributes: { "remote_control_program.runtime_id": runtimeId } },
      async (span: Span) => {
        try {
          await callback();
        } finally {
          span.end();
        }
      },
    );
  }
}
