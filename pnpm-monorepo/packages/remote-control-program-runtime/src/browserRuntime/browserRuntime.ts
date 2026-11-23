import {
  CONNECTOR_CATALOG,
  CapabilityId,
  ConnectorId,
  LOG_ENTRIES_CAPABILITY,
  RelayCloseReason,
  RuntimeKind,
  getOldestLogAnalyzerEntryVersion,
  type AnnounceContent,
  type FeedEntriesContent,
  type LogAnalyzerEntryType,
} from "@sam-monorepo/domain";
import {
  ChannelClient,
  ChannelStatus,
  ConnectionTokenRefusedError,
  type ChannelState,
  type ChannelTimers,
  type CreateChannelWebSocket,
} from "../channel/channelClient.js";
import { CHANNEL_CLIENT_LIMITS } from "../channel/channelLimits.js";
import { getReconnectDelayMilliseconds } from "../channel/reconnectDelay.js";
import {
  LIVE_PERIOD_HEARTBEAT_INTERVAL_MILLISECONDS,
  LIVE_PERIOD_RETENTION_MILLISECONDS,
  TAB_CHANGE_GAP_MILLISECONDS,
} from "../localAccess/livePeriods.js";
import {
  createLocalAccessLayer,
  type LocalAccessLayer,
  type LocalAccessSettings,
  type OlderEntriesTimeRange,
  type StopReadingOptions,
} from "../localAccess/localAccessLayer.js";
import type { LocalAccessStorage } from "../localAccess/localAccessStorage.js";
import type { LogSelection } from "../logFile/selectLogFiles.js";
import type { EntryWindow, RawMatch, ReadProgress } from "../logFile/types.js";
import {
  createLogFolderReader,
  type LogFolderReader,
} from "./logFolderReader.js";
import {
  MAXIMUM_OWN_ENTRIES,
  OwnEntriesChangeMode,
  type OwnEntryStore,
} from "./ownEntryStore.js";
import { readRunRecord, writeRunRecord } from "./runRecord.js";

/**
 * The interval of the reads of the log folder, the same as the live mode of
 * the old Log Analyzer. A read takes only the new lines of `Game.log`. The
 * timers of a hidden tab can run only once each minute.
 */
export const LOG_FOLDER_READ_INTERVAL_MILLISECONDS = 10_000;

/**
 * The runtime always reads the log files of this time: the entries that can
 * go up automatically are not older than the stored live periods.
 */
const LIVE_WINDOW_MILLISECONDS = LIVE_PERIOD_RETENTION_MILLISECONDS;

/**
 * The entries that the runtime gives to the channel client at one time: two
 * batches. The others wait in the outbox of the runtime. Thus the rules of the
 * local access layer apply again right before each send (a type that the
 * owner turned off stops its entries), and a large request for older entries
 * does not fill the queue of the channel client.
 */
const OUTBOX_CHANNEL_ENTRY_LIMIT =
  2 * LOG_ENTRIES_CAPABILITY.maximumEntriesPerBatch;

/**
 * The entries that wait in the outbox, for example while the relay is not
 * available. The outbox holds the entries of the store, thus its limit is the
 * limit of the store. Above it, the oldest entries stay on the machine.
 */
const MAXIMUM_OUTBOX_ENTRIES = MAXIMUM_OWN_ENTRIES;

/**
 * The pages of `findOwnEntryKeys` for one check: 2 times the entries of the
 * store with 2,000 keys on each page. Above it, the runtime sends the entries
 * without a check, and the relay removes the duplicates.
 */
const MAXIMUM_KEY_PAGES = 50;

/**
 * The delay before the next try of the check of the relay after a failed
 * check. The runtime tries again after the next read after the delay.
 */
const RELAY_CHECK_RETRY_DELAY_MILLISECONDS = 60_000;

/**
 * The first token request also tells the URL of the relay. The channel client
 * uses this token for its first `hello` when it is not older than this time.
 * The renewal of the channel client counts from its own request, thus an
 * older token would come to the renewal too late.
 */
const PREFETCHED_TOKEN_MAXIMUM_AGE_MILLISECONDS = 10_000;

const LOG_FILE_CONNECTOR = CONNECTOR_CATALOG[ConnectorId.LogFile];

export enum RelayAvailability {
  /** The runtime did not ask the app yet */
  Unknown = "unknown",
  /** The app has no relay service: the runtime works only on this machine */
  NotConfigured = "not_configured",
  /**
   * The app refused the connection token, for example without
   * `remoteControlProgram;use` or after a ban
   */
  Refused = "refused",
  /** The app has a relay service. `channel` tells the state of the connection. */
  Available = "available",
}

/**
 * The problems of the browser runtime: in `BrowserRuntimeState.error`, and
 * in `BrowserRuntimeError` of a command
 */
export enum BrowserRuntimeErrorCode {
  /** The last read of the log folder failed (state) */
  ReadFailed = "read_failed",
  /** The browser has no File System Access API (command) */
  NotSupported = "not_supported",
  /** No tab with the runtime answered the command in time (command) */
  NoAnswer = "no_answer",
  /**
   * No folder is selected, or the browser needs a click to give the access
   * again (command)
   */
  FolderNotGranted = "folder_not_granted",
  /** The runtime does not read the log (command) */
  NotRunning = "not_running",
  /** The app has no relay service, or refused the token (command) */
  RelayNotAvailable = "relay_not_available",
  /** The app did not tell which entries the relay already has (command) */
  RelayCheckFailed = "relay_check_failed",
  /**
   * A newer request for older entries replaced the request, or a different
   * tab took the runtime (command)
   */
  RequestExpired = "request_expired",
}

export class BrowserRuntimeError extends Error {
  readonly code: BrowserRuntimeErrorCode;

  constructor(code: BrowserRuntimeErrorCode, options?: ErrorOptions) {
    super(`Browser runtime: ${code}`, options);
    this.name = "BrowserRuntimeError";
    this.code = code;
  }
}

/** The uploads since this tab has the runtime */
export interface UploadCounts {
  /** The entries that the relay accepted */
  readonly acceptedEntryCount: number;
  /** The accepted entries that the relay did not have before */
  readonly newEntryCount: number;
  /** The entries that did not go up (see `ChannelDropReason`) */
  readonly droppedEntryCount: number;
}

export interface BrowserRuntimeState {
  /** The runtime reads the log folder */
  readonly isRunning: boolean;
  readonly relayAvailability: RelayAvailability;
  /** Null until the app told the URL of the relay */
  readonly channel: ChannelState | null;
  /** The end of the last read of the log folder */
  readonly lastReadAt: Date | null;
  /**
   * The newest line of the log files (see `ReadResult.newestIsoDate`). For
   * the Live-Status of the own session.
   */
  readonly newestLogLineAt: Date | null;
  /** What the listing of the folder told at the last read */
  readonly logSelection: LogSelection | null;
  /** The progress of a read that takes files from the disk */
  readonly readProgress: ReadProgress | null;
  readonly uploadCounts: UploadCounts;
  readonly error: BrowserRuntimeErrorCode | null;
}

export const INITIAL_BROWSER_RUNTIME_STATE: BrowserRuntimeState = {
  isRunning: false,
  relayAvailability: RelayAvailability.Unknown,
  channel: null,
  lastReadAt: null,
  newestLogLineAt: null,
  logSelection: null,
  readProgress: null,
  uploadCounts: {
    acceptedEntryCount: 0,
    newEntryCount: 0,
    droppedEntryCount: 0,
  },
  error: null,
};

/** The answer of the token route of the app */
export interface ConnectionTokenGrant {
  readonly token: string;
  /** Null when the app has no relay service */
  readonly relayUrl: URL | null;
}

/** `end` is exclusive */
export interface OwnEntryKeysQuery {
  readonly start: Date;
  readonly end: Date;
  /** The `nextPageCursor` of the previous page. Null for the first page. */
  readonly pageCursor: string | null;
}

export interface OwnEntryKeysPage {
  /** The keys (`RawMatch.hash`) of the own entries that the relay has */
  readonly keys: readonly string[];
  /** Null on the last page */
  readonly nextPageCursor: string | null;
}

/** A request for older entries, which the owner confirms */
export interface PreparedOlderEntriesRequest {
  readonly id: string;
  readonly range: OlderEntriesTimeRange;
  /** The number of entries for each type, by the oldest version of the type */
  readonly countsByType: ReadonlyMap<LogAnalyzerEntryType, number>;
  readonly entryCount: number;
}

export interface BrowserRuntimeOptions {
  /** The id that the browser keeps (see `runtimeIdSchema`) */
  readonly runtimeId: string;
  readonly runtimeVersion: string;
  /** `localStorage`, which all tabs share */
  readonly storage: LocalAccessStorage;
  /**
   * The own entries. The tab gives its store, thus the entries that it got
   * from the previous runtime stay.
   */
  readonly entryStore: OwnEntryStore;
  /**
   * Gives a connection token and the URL of the relay. It throws
   * `ConnectionTokenRefusedError` when the app refuses the token.
   */
  readonly requestConnectionToken: (
    signal: AbortSignal,
  ) => Promise<ConnectionTokenGrant>;
  /**
   * Gives the keys of the own entries that the relay has. It must end in a
   * short time (the app uses a timeout).
   */
  readonly findOwnEntryKeys: (
    query: OwnEntryKeysQuery,
  ) => Promise<OwnEntryKeysPage>;
  /** The Web Worker reader by default. The tests give a different reader. */
  readonly createLogFolderReader?: (
    folder: FileSystemDirectoryHandle,
  ) => LogFolderReader;
  /** The browser WebSocket by default */
  readonly createWebSocket?: CreateChannelWebSocket;
  /** `performance.now()` and `setTimeout()` by default */
  readonly timers?: ChannelTimers;
  /** The clock of the entries and of the live periods */
  readonly now?: () => Date;
  /** `Math.random()` by default */
  readonly random?: () => number;
}

export type BrowserRuntimeStateListener = (state: BrowserRuntimeState) => void;

interface OutboxEntry {
  readonly entry: RawMatch;
  /** The owner confirmed it in a request for older entries */
  readonly isConfirmed: boolean;
}

interface OlderEntriesRequest {
  readonly id: string;
  readonly range: OlderEntriesTimeRange;
  readonly entries: readonly RawMatch[];
  readonly countsByType: ReadonlyMap<LogAnalyzerEntryType, number>;
}

const defaultTimers: ChannelTimers = {
  now: () => performance.now(),
  schedule: (callback, delayMilliseconds) => {
    const handle = setTimeout(callback, delayMilliseconds);
    return () => clearTimeout(handle);
  },
};

/** Null when no entry has a valid time */
const getTimeRange = (entries: readonly RawMatch[]) => {
  let start = Number.POSITIVE_INFINITY;
  let end = Number.NEGATIVE_INFINITY;
  for (const entry of entries) {
    const time = Date.parse(entry.isoDate);
    if (Number.isNaN(time)) continue;

    start = Math.min(start, time);
    end = Math.max(end, time);
  }

  if (!Number.isFinite(start)) return null;
  return { start: new Date(start), end: new Date(end + 1) };
};

const countByRuleType = (entries: readonly RawMatch[]) => {
  const countsByType = new Map<LogAnalyzerEntryType, number>();
  for (const entry of entries) {
    const ruleType = getOldestLogAnalyzerEntryVersion(entry.type);
    countsByType.set(ruleType, (countsByType.get(ruleType) ?? 0) + 1);
  }
  return countsByType;
};

/** Null for an entry without a valid time. The relay would refuse it. */
const toFeedEntry = (
  entry: RawMatch,
): FeedEntriesContent["entries"][number] | null => {
  const time = Date.parse(entry.isoDate);
  if (Number.isNaN(time)) return null;

  return {
    type: entry.type,
    raw_line: entry.rawLine,
    event_at: new Date(time).toISOString(),
    line_number: entry.lineNumber,
  };
};

const isLogEntriesTurnedOff = (state: ChannelState) =>
  state.closeReason === RelayCloseReason.ProgramTurnedOff ||
  state.turnedOffConnectorIds.includes(ConnectorId.LogFile) ||
  state.turnedOffCapabilityIds.includes(CapabilityId.LogEntries);

/**
 * The value for `setRelayStopped()` of the local access layer. Null: the
 * channel state does not tell it.
 *
 * A part that the switches turned off stops the live periods like the "Stop
 * all" of the owner. Thus an automatic upload after the part is on again does
 * not send the entries of the time in which it was off (decision 6 of the
 * plan).
 */
const getRelayStopped = (state: ChannelState): boolean | null => {
  switch (state.status) {
    case ChannelStatus.Connected:
      return state.isStoppedByOwner || isLogEntriesTurnedOff(state);

    // The newer connection of the same runtime continues
    case ChannelStatus.Ended:
      return state.closeReason === RelayCloseReason.Replaced ? null : true;

    case ChannelStatus.Idle:
    case ChannelStatus.Connecting:
    case ChannelStatus.WaitingForReconnect:
      return isLogEntriesTurnedOff(state) ? true : null;

    default:
      throw new Error(
        `Unknown channel status: ${state.status satisfies never}`,
      );
  }
};

/**
 * The browser runtime of the tab that holds the Web Lock of the browser (see
 * `docs/remote-control-program/README.md#browser-runtime`). It combines the
 * log file connector, the local access layer and the channel client:
 *
 * - It reads the log folder each `LOG_FOLDER_READ_INTERVAL_MILLISECONDS`
 *   while it runs, and keeps the own entries in the entry store.
 * - It connects to the relay while it runs, when the app has a relay.
 * - An entry goes up automatically only when the local access layer permits
 *   it (decision 27), and only one time. After a start (also after a change
 *   of the active tab), the first read offers the entries of the stored live
 *   periods again. The runtime sends only the entries that the relay does not
 *   have (`findOwnEntryKeys`).
 * - Older entries go up only through a request that the owner confirms.
 *
 * Make one runtime when the tab gets the Web Lock, and call `handOver()` when
 * the tab loses it or closes.
 */
export class BrowserRuntime {
  readonly #options: BrowserRuntimeOptions;
  readonly #timers: ChannelTimers;
  readonly #now: () => Date;
  readonly #random: () => number;
  readonly #entryStore: OwnEntryStore;
  readonly #listeners = new Set<BrowserRuntimeStateListener>();
  /**
   * The running state of the previous runtime of this browser when it ended
   * a short time before. Null: no runtime ran a short time before.
   */
  readonly #previousIsRunning: boolean | null;
  readonly #unsubscribeEntryStore: () => void;
  #state = INITIAL_BROWSER_RUNTIME_STATE;
  /** A new layer at each start, thus each start waits for a new `welcome` */
  #layer: LocalAccessLayer;
  #isDisposed = false;
  /**
   * The tab wants the runtime to run, but cannot start it yet, for example
   * because the browser needs a click for the folder (see
   * `setWaitingForStart()`)
   */
  #isWaitingForStart = false;

  #folder: FileSystemDirectoryHandle | null = null;
  #reader: LogFolderReader | null = null;
  /** Each start and stop counts up. An async step of an older run ends. */
  #runGeneration = 0;
  /** The window of a control UI, in addition to the live window */
  #requestedWindow: EntryWindow | null = null;
  /** The windows of the next read only, for a request for older entries */
  #oneTimeWindows: EntryWindow[] = [];
  #readInFlight: Promise<void> | null = null;
  #isReadRequested = false;
  #cancelReadTimer: (() => void) | null = null;
  #cancelPresenceTimer: (() => void) | null = null;

  #channel: ChannelClient | null = null;
  #unsubscribeChannel: (() => void) | null = null;
  #cancelRelayRetry: (() => void) | null = null;
  #failedRelayRequestCount = 0;
  #prefetchedToken: {
    readonly token: string;
    readonly requestedAt: number;
  } | null = null;
  /** The value that the layer got last. Null until the first `welcome`. */
  #relayStopped: boolean | null = null;

  /** The relay sent the `welcome` in this run */
  #isRelayWelcomed = false;
  #hasCompletedRead = false;
  /**
   * The check of the entries that were read before the first upload of this
   * run (see `#runFirstUpload`) is done
   */
  #isFirstUploadDone = false;
  #isFirstUploadRunning = false;
  #nextRelayCheckAt = 0;
  /** The keys of the entries that wait for the first upload of this run */
  readonly #waitingKeys = new Set<string>();
  #outbox: OutboxEntry[] = [];
  #isFlushingOutbox = false;
  #olderEntriesRequest: OlderEntriesRequest | null = null;

  constructor(options: BrowserRuntimeOptions) {
    this.#options = options;
    this.#timers = options.timers ?? defaultTimers;
    this.#now = options.now ?? (() => new Date());
    this.#random = options.random ?? Math.random;
    this.#entryStore = options.entryStore;
    this.#layer = this.#createLayer();

    const previousRecord = readRunRecord(options.storage);
    this.#previousIsRunning =
      previousRecord !== null &&
      this.#now().getTime() - previousRecord.updatedAt <=
        TAB_CHANGE_GAP_MILLISECONDS
        ? previousRecord.isRunning
        : null;

    this.#unsubscribeEntryStore = this.#entryStore.subscribe((change) => {
      for (const key of change.removedKeys) this.#waitingKeys.delete(key);
    });

    this.#schedulePresence();
  }

  getState() {
    return this.#state;
  }

  /** Returns the function that ends the subscription */
  subscribe(listener: BrowserRuntimeStateListener) {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  /**
   * Whether this runtime starts after it took over: it continues the state
   * of a runtime that ended a short time before (for example the closed tab
   * of the previous runtime, or a reload): running or waiting for a start,
   * or stopped. Else it obeys the autostart.
   */
  shouldRun(isAutostartEnabled: boolean) {
    return this.#previousIsRunning ?? isAutostartEnabled;
  }

  /**
   * Reads the folder. The tab must have the read permission for it. A
   * different handle object counts as a different folder and replaces the
   * entries: give the same object again for the same folder.
   */
  start(folder: FileSystemDirectoryHandle) {
    if (this.#isDisposed) return;
    if (this.#state.isRunning) {
      if (folder === this.#folder) return;
      // The owner selected a different folder: no line of the new folder continues the period of the previous folder
      this.#stopReading({ canContinue: false });
    }

    if (folder !== this.#folder) this.#useFolder(folder);

    this.#runGeneration += 1;
    this.#layer = this.#createLayer();
    this.#relayStopped = null;
    this.#isRelayWelcomed = false;
    this.#hasCompletedRead = false;
    this.#isFirstUploadDone = false;
    this.#nextRelayCheckAt = 0;
    // The entries of the previous runtime or of the previous run can be in
    // the live periods and wait for their upload
    if (this.#canUpload())
      for (const entry of this.#entryStore.values())
        this.#waitingKeys.add(entry.hash);

    this.#layer.startReading();
    this.#isWaitingForStart = false;
    this.#setState({ isRunning: true, error: null });
    this.#writeRunRecord();

    void this.#connectRelay(this.#runGeneration);
    void this.#read();
  }

  /**
   * The owner stops the runtime, or the tab lost the access to the folder.
   * The live period ends without a continuation: a next start, also within
   * `TAB_CHANGE_GAP_MILLISECONDS`, starts a new period, and the entries of
   * the stopped time stay on the machine (decision 6 of the plan). The next
   * runtime of this browser stays stopped.
   */
  stop() {
    if (this.#isDisposed) return;

    this.#isWaitingForStart = false;
    if (this.#state.isRunning) {
      this.#stopReading({ canContinue: false });
    } else {
      // A runtime that did not read yet must not let a next start continue the period of the previous runtime
      this.#layer.stopReading({ canContinue: false });
    }
    this.#writeRunRecord();
  }

  /**
   * The tab wants the runtime to run, but cannot start it yet (for example
   * the browser needs a click for the folder). A next runtime after a change
   * of the active tab also wants to run then.
   */
  setWaitingForStart(isWaiting: boolean) {
    if (this.#isWaitingForStart === isWaiting) return;

    this.#isWaitingForStart = isWaiting;
    this.#writeRunRecord();
  }

  /**
   * The tab loses the runtime, for example when it closes. The next runtime
   * continues the state of this runtime, and its live period within
   * `TAB_CHANGE_GAP_MILLISECONDS`.
   */
  handOver() {
    if (this.#isDisposed) return;

    const shouldRun = this.#state.isRunning || this.#isWaitingForStart;
    if (this.#state.isRunning) this.#stopReading({ canContinue: true });
    this.#writeRunRecord(shouldRun);
    this.#dispose();
  }

  /**
   * The window of the entries that a control UI shows. The runtime reads
   * also the log files of this window. Null: only the live window.
   */
  setRequestedWindow(window: EntryWindow | null) {
    this.#requestedWindow = window;
    if (this.#state.isRunning) void this.#readNow();
  }

  getLocalAccessSettings(): LocalAccessSettings {
    return this.#layer.getSettings();
  }

  setLogEntryTypes(types: readonly LogAnalyzerEntryType[], isOn: boolean) {
    this.#layer.setLogEntryTypes(types, isOn);
    this.handleLocalAccessChange();
  }

  /** The "Stop all" of this browser */
  stopAll() {
    this.#layer.stopAll();
    this.handleLocalAccessChange();
  }

  startAll() {
    this.#layer.startAll();
    this.handleLocalAccessChange();
  }

  /**
   * After a change of the settings of the local access layer, also in a
   * different tab (the `storage` event)
   */
  handleLocalAccessChange() {
    if (this.#isDisposed) return;

    if (this.#state.isRunning) this.#layer.heartbeat();
    this.#channel?.updateAnnouncement(this.#createAnnouncement());
    this.#flushOutbox();
  }

  /**
   * Reads the log files of the range and prepares the request: the entries
   * whose types are on, which do not go up automatically, and which the
   * relay does not have.
   */
  async prepareOlderEntriesRequest(
    range: OlderEntriesTimeRange,
  ): Promise<PreparedOlderEntriesRequest> {
    this.#requireUploads();
    const generation = this.#runGeneration;

    await this.#readNow([range]);
    if (generation !== this.#runGeneration)
      throw new BrowserRuntimeError(BrowserRuntimeErrorCode.NotRunning);

    let { entries } = this.#layer.prepareOlderEntriesRequest(
      this.#entryStore.values(),
      range,
    );

    const timeRange = getTimeRange(entries);
    if (timeRange !== null) {
      let relayKeys: Set<string>;
      try {
        relayKeys = await this.#findRelayKeys(timeRange);
      } catch (error) {
        throw new BrowserRuntimeError(
          BrowserRuntimeErrorCode.RelayCheckFailed,
          { cause: error },
        );
      }
      if (generation !== this.#runGeneration)
        throw new BrowserRuntimeError(BrowserRuntimeErrorCode.NotRunning);

      entries = entries.filter((entry) => !relayKeys.has(entry.hash));
    }

    const request: OlderEntriesRequest = {
      id: crypto.randomUUID(),
      range,
      entries,
      countsByType: countByRuleType(entries),
    };
    this.#olderEntriesRequest = request;

    return {
      id: request.id,
      range,
      countsByType: request.countsByType,
      entryCount: entries.length,
    };
  }

  /**
   * Sends the entries of the prepared request whose types are still on.
   * Returns their number.
   */
  confirmOlderEntriesRequest(requestId: string) {
    this.#requireUploads();

    const request = this.#olderEntriesRequest;
    if (request?.id !== requestId)
      throw new BrowserRuntimeError(BrowserRuntimeErrorCode.RequestExpired);
    this.#olderEntriesRequest = null;

    const entries = this.#layer.confirmOlderEntriesRequest(request);
    this.#enqueue(entries, true);
    return entries.length;
  }

  #createLayer() {
    return createLocalAccessLayer({
      storage: this.#options.storage,
      now: this.#now,
    });
  }

  #setState(changes: Partial<BrowserRuntimeState>) {
    this.#state = { ...this.#state, ...changes };
    for (const listener of this.#listeners) listener(this.#state);
  }

  #requireUploads() {
    if (!this.#state.isRunning)
      throw new BrowserRuntimeError(BrowserRuntimeErrorCode.NotRunning);
    if (this.#state.relayAvailability !== RelayAvailability.Available)
      throw new BrowserRuntimeError(BrowserRuntimeErrorCode.RelayNotAvailable);
  }

  #writeRunRecord(
    isRunning = this.#state.isRunning || this.#isWaitingForStart,
  ) {
    try {
      writeRunRecord(this.#options.storage, {
        isRunning,
        updatedAt: this.#now().getTime(),
      });
    } catch (error) {
      // Without the record, the next runtime obeys the autostart
      console.error(
        "[Remote Control Program] Error writing the run record:",
        error,
      );
    }
  }

  #useFolder(folder: FileSystemDirectoryHandle) {
    const isFolderChange = this.#folder !== null;

    this.#reader?.dispose();
    this.#folder = folder;
    this.#reader = (
      this.#options.createLogFolderReader ?? createLogFolderReader
    )(folder);
    this.#olderEntriesRequest = null;

    if (isFolderChange) {
      this.#waitingKeys.clear();
      this.#entryStore.apply({
        mode: OwnEntriesChangeMode.Replace,
        entries: [],
      });
      this.#setState({ newestLogLineAt: null, logSelection: null });
    }
  }

  /**
   * Only a hand-over lets a next runtime continue the live period (see
   * `LocalAccessLayer.stopReading`)
   */
  #stopReading(options: StopReadingOptions) {
    this.#runGeneration += 1;
    this.#cancelReadTimer?.();
    this.#cancelReadTimer = null;
    this.#cancelRelayRetry?.();
    this.#cancelRelayRetry = null;
    this.#reader?.stopRead();
    this.#layer.stopReading(options);

    this.#channel?.disconnect();
    this.#prefetchedToken = null;
    this.#olderEntriesRequest = null;
    this.#setState({ isRunning: false, readProgress: null });
  }

  #dispose() {
    this.#isDisposed = true;
    this.#cancelPresenceTimer?.();
    this.#cancelPresenceTimer = null;
    this.#reader?.dispose();
    this.#reader = null;
    this.#unsubscribeChannel?.();
    this.#channel?.disconnect();
    this.#unsubscribeEntryStore();
    this.#listeners.clear();
  }

  /**
   * The heartbeat of the live periods while the runtime reads, and the run
   * record also while it does not read
   */
  #schedulePresence() {
    this.#cancelPresenceTimer = this.#timers.schedule(() => {
      this.#cancelPresenceTimer = null;
      if (this.#isDisposed) return;

      try {
        if (this.#state.isRunning) this.#layer.heartbeat();
      } catch (error) {
        console.error(
          "[Remote Control Program] Error in the heartbeat:",
          error,
        );
      }
      this.#writeRunRecord();
      this.#schedulePresence();
    }, LIVE_PERIOD_HEARTBEAT_INTERVAL_MILLISECONDS);
  }

  #getReadWindows(): EntryWindow[] {
    const liveWindow: EntryWindow = {
      start: new Date(this.#now().getTime() - LIVE_WINDOW_MILLISECONDS),
      end: null,
    };

    return [
      liveWindow,
      ...(this.#requestedWindow ? [this.#requestedWindow] : []),
      ...this.#oneTimeWindows,
    ];
  }

  #scheduleRead(delayMilliseconds: number) {
    this.#cancelReadTimer?.();
    this.#cancelReadTimer = this.#timers.schedule(() => {
      this.#cancelReadTimer = null;
      void this.#read();
    }, delayMilliseconds);
  }

  /** One read at a time. A read that is requested during a read runs after it. */
  #read() {
    if (this.#readInFlight !== null) {
      this.#isReadRequested = true;
      return this.#readInFlight;
    }

    this.#cancelReadTimer?.();
    this.#cancelReadTimer = null;

    const generation = this.#runGeneration;
    const read = this.#readOnce(generation).finally(() => {
      this.#readInFlight = null;
      if (this.#isDisposed || !this.#state.isRunning) return;

      // A read of a previous run delayed the first read of this run
      const isReadDue =
        this.#isReadRequested || generation !== this.#runGeneration;
      this.#isReadRequested = false;
      this.#scheduleRead(isReadDue ? 0 : LOG_FOLDER_READ_INTERVAL_MILLISECONDS);
    });
    this.#readInFlight = read;
    return read;
  }

  /**
   * A read with the current windows. A read that is in flight stops between
   * two files, and the next read continues it.
   */
  async #readNow(oneTimeWindows: EntryWindow[] = []) {
    if (this.#readInFlight !== null) {
      this.#reader?.stopRead();
      await this.#readInFlight;
    }

    this.#oneTimeWindows = oneTimeWindows;
    await this.#read();
  }

  async #readOnce(generation: number) {
    const reader = this.#reader;
    if (!reader || !this.#state.isRunning) return;

    const windows = this.#getReadWindows();
    this.#oneTimeWindows = [];

    try {
      const result = await reader.read(windows, (readProgress) => {
        if (generation === this.#runGeneration)
          this.#setState({ readProgress });
      });
      if (generation !== this.#runGeneration) return;

      this.#hasCompletedRead = true;
      const { entries: addedEntries } = this.#entryStore.apply({
        mode: OwnEntriesChangeMode.Append,
        entries: result.matches,
      });

      // A read of an older window must not move the time back
      const newestLogLineAt =
        result.newestIsoDate === null ? null : new Date(result.newestIsoDate);
      const previousNewestLogLineAt = this.#state.newestLogLineAt;

      this.#setState({
        lastReadAt: this.#now(),
        newestLogLineAt:
          previousNewestLogLineAt !== null &&
          (newestLogLineAt === null ||
            previousNewestLogLineAt >= newestLogLineAt)
            ? previousNewestLogLineAt
            : newestLogLineAt,
        logSelection: result.selection,
        readProgress: null,
        error: null,
      });

      this.#handleReadEntries(addedEntries);
    } catch (error) {
      if (generation !== this.#runGeneration) return;

      console.error(
        "[Remote Control Program] Error reading the log folder:",
        error,
      );
      this.#setState({
        readProgress: null,
        error: BrowserRuntimeErrorCode.ReadFailed,
      });
    }
  }

  /** False when the app has no relay or refused the token */
  #canUpload() {
    const { relayAvailability } = this.#state;
    return (
      relayAvailability !== RelayAvailability.NotConfigured &&
      relayAvailability !== RelayAvailability.Refused
    );
  }

  #handleReadEntries(addedEntries: readonly RawMatch[]) {
    if (!this.#canUpload()) return;

    if (!this.#isFirstUploadDone) {
      for (const entry of addedEntries) this.#waitingKeys.add(entry.hash);
      void this.#runFirstUpload();
      return;
    }

    this.#enqueue(this.#layer.selectAutomaticUploads(addedEntries), false);
  }

  /**
   * The first upload of a run: the entries that were read before it. They
   * can be in the live periods of a previous runtime, thus the relay can
   * already have them. It needs a completed read and the `welcome`: before
   * the `welcome`, the layer does not know the "Stop all" of the owner.
   */
  async #runFirstUpload() {
    const channel = this.#channel;
    if (
      channel === null ||
      this.#isFirstUploadDone ||
      this.#isFirstUploadRunning ||
      !this.#state.isRunning ||
      !this.#hasCompletedRead ||
      !this.#isRelayWelcomed ||
      this.#timers.now() < this.#nextRelayCheckAt
    )
      return;

    const generation = this.#runGeneration;
    const checkedKeys = Array.from(this.#waitingKeys);
    const candidates = this.#layer.selectAutomaticUploads(
      this.#getStoredEntries(checkedKeys),
    );

    let missingEntries = candidates;
    const timeRange = getTimeRange(candidates);
    // The channel client removes the entries of a part that is off. The
    // relay refuses the check in this case.
    if (timeRange !== null && !isLogEntriesTurnedOff(channel.getState())) {
      this.#isFirstUploadRunning = true;
      let relayKeys: Set<string>;
      try {
        relayKeys = await this.#findRelayKeys(timeRange);
      } catch (error) {
        console.warn(
          "[Remote Control Program] Error checking the entries of the relay:",
          error,
        );
        this.#nextRelayCheckAt =
          this.#timers.now() + RELAY_CHECK_RETRY_DELAY_MILLISECONDS;
        return;
      } finally {
        this.#isFirstUploadRunning = false;
      }
      if (generation !== this.#runGeneration) return;

      missingEntries = candidates.filter((entry) => !relayKeys.has(entry.hash));
    }

    for (const key of checkedKeys) this.#waitingKeys.delete(key);
    this.#isFirstUploadDone = true;
    this.#enqueue(missingEntries, false);

    // The new lines of the reads during the check
    const laterEntries = this.#getStoredEntries(Array.from(this.#waitingKeys));
    this.#waitingKeys.clear();
    this.#enqueue(this.#layer.selectAutomaticUploads(laterEntries), false);
  }

  #getStoredEntries(keys: readonly string[]) {
    return keys
      .map((key) => this.#entryStore.get(key))
      .filter((entry) => entry !== undefined);
  }

  async #findRelayKeys(range: { readonly start: Date; readonly end: Date }) {
    const keys = new Set<string>();
    let pageCursor: string | null = null;

    for (let pageIndex = 0; pageIndex < MAXIMUM_KEY_PAGES; pageIndex += 1) {
      const page = await this.#options.findOwnEntryKeys({
        start: range.start,
        end: range.end,
        pageCursor,
      });
      for (const key of page.keys) keys.add(key);

      if (page.nextPageCursor === null) break;
      pageCursor = page.nextPageCursor;
    }

    return keys;
  }

  #enqueue(entries: readonly RawMatch[], isConfirmed: boolean) {
    if (entries.length === 0) return;

    for (const entry of entries) this.#outbox.push({ entry, isConfirmed });

    const excessCount = this.#outbox.length - MAXIMUM_OUTBOX_ENTRIES;
    if (excessCount > 0) {
      this.#outbox.splice(0, excessCount);
      this.#addUploadCounts({ droppedEntryCount: excessCount });
    }

    this.#flushOutbox();
  }

  /**
   * Gives the channel client the next entries of the outbox, until its queue
   * holds `OUTBOX_CHANNEL_ENTRY_LIMIT` entries. Each `ack` of the relay
   * changes the channel state and calls it again.
   */
  #flushOutbox() {
    const channel = this.#channel;
    if (this.#isFlushingOutbox || channel === null || !this.#isRelayWelcomed)
      return;

    // The channel client calls the state listener during the send
    this.#isFlushingOutbox = true;
    try {
      while (this.#outbox.length > 0) {
        const space =
          OUTBOX_CHANNEL_ENTRY_LIMIT - channel.getState().queuedEntryCount;
        if (space <= 0) break;

        const feedEntries = this.#selectSendableEntries(
          this.#outbox.splice(0, space),
        );
        if (feedEntries.length > 0)
          channel.sendFeedEntries({
            capability_id: CapabilityId.LogEntries,
            capability_version: LOG_ENTRIES_CAPABILITY.version,
            connector_id: ConnectorId.LogFile,
            connector_version: LOG_FILE_CONNECTOR.version,
            entries: feedEntries,
          });
      }
    } finally {
      this.#isFlushingOutbox = false;
    }
  }

  /**
   * The rules of the local access layer right before the send: the
   * automatic entries must still go up automatically, and the confirmed
   * entries need a type that is on and no "Stop all" of this browser
   */
  #selectSendableEntries(outboxEntries: readonly OutboxEntry[]) {
    const automaticEntries = this.#layer.selectAutomaticUploads(
      outboxEntries
        .filter((outboxEntry) => !outboxEntry.isConfirmed)
        .map((outboxEntry) => outboxEntry.entry),
    );

    const settings = this.#layer.getSettings();
    const confirmedEntries =
      settings.stoppedAt === null
        ? outboxEntries
            .filter(
              (outboxEntry) =>
                outboxEntry.isConfirmed &&
                settings.logEntryTypes[outboxEntry.entry.type],
            )
            .map((outboxEntry) => outboxEntry.entry)
        : [];

    return [...automaticEntries, ...confirmedEntries]
      .map(toFeedEntry)
      .filter((feedEntry) => feedEntry !== null);
  }

  #addUploadCounts(counts: Partial<UploadCounts>) {
    const { uploadCounts } = this.#state;
    this.#setState({
      uploadCounts: {
        acceptedEntryCount:
          uploadCounts.acceptedEntryCount + (counts.acceptedEntryCount ?? 0),
        newEntryCount: uploadCounts.newEntryCount + (counts.newEntryCount ?? 0),
        droppedEntryCount:
          uploadCounts.droppedEntryCount + (counts.droppedEntryCount ?? 0),
      },
    });
  }

  #createAnnouncement(): AnnounceContent {
    return {
      // The channel connects only while the connector reads the folder
      connectors: [
        {
          id: ConnectorId.LogFile,
          version: LOG_FILE_CONNECTOR.version,
          capabilities: [
            {
              id: CapabilityId.LogEntries,
              version: LOG_ENTRIES_CAPABILITY.version,
            },
          ],
        },
      ],
      local_access_layer: this.#layer.getAnnouncementSummary(),
    };
  }

  /**
   * Connects the channel client. The first token request tells the URL of
   * the relay. Without a URL, the runtime works only on this machine.
   */
  async #connectRelay(generation: number) {
    if (generation !== this.#runGeneration || !this.#state.isRunning) return;

    if (this.#channel !== null) {
      this.#channel.updateAnnouncement(this.#createAnnouncement());
      this.#channel.connect();
      return;
    }

    if (!this.#canUpload()) return;

    const controller = new AbortController();
    const cancelTimeout = this.#timers.schedule(
      () => controller.abort(new Error("The token request timed out")),
      CHANNEL_CLIENT_LIMITS.tokenRequestTimeoutMilliseconds,
    );

    let grant: ConnectionTokenGrant;
    try {
      grant = await this.#options.requestConnectionToken(controller.signal);
    } catch (error) {
      if (generation !== this.#runGeneration) return;

      if (error instanceof ConnectionTokenRefusedError) {
        this.#setRelayUnavailable(RelayAvailability.Refused);
        return;
      }

      this.#failedRelayRequestCount += 1;
      this.#cancelRelayRetry = this.#timers.schedule(
        () => {
          this.#cancelRelayRetry = null;
          void this.#connectRelay(generation);
        },
        getReconnectDelayMilliseconds(
          this.#failedRelayRequestCount,
          this.#random,
        ),
      );
      return;
    } finally {
      cancelTimeout();
    }
    if (generation !== this.#runGeneration || this.#isDisposed) return;

    this.#failedRelayRequestCount = 0;
    if (grant.relayUrl === null) {
      this.#setRelayUnavailable(RelayAvailability.NotConfigured);
      return;
    }

    this.#prefetchedToken = {
      token: grant.token,
      requestedAt: this.#timers.now(),
    };

    const channel = new ChannelClient({
      relayUrl: grant.relayUrl,
      runtimeId: this.#options.runtimeId,
      runtimeKind: RuntimeKind.browser,
      runtimeVersion: this.#options.runtimeVersion,
      announcement: this.#createAnnouncement(),
      getConnectionToken: (signal) => this.#getConnectionToken(signal),
      createWebSocket: this.#options.createWebSocket,
      timers: this.#options.timers,
      random: this.#options.random,
      onEntriesAccepted: ({ entryCount, newEntryCount }) =>
        this.#addUploadCounts({
          acceptedEntryCount: entryCount,
          newEntryCount: newEntryCount ?? 0,
        }),
      onEntriesDropped: ({ entryCount }) =>
        this.#addUploadCounts({ droppedEntryCount: entryCount }),
    });
    this.#channel = channel;
    this.#unsubscribeChannel = channel.subscribe((state) =>
      this.#handleChannelState(state),
    );
    this.#setState({
      relayAvailability: RelayAvailability.Available,
      channel: channel.getState(),
    });

    channel.connect();
  }

  /** No entry goes up: the runtime does not keep them for the upload */
  #setRelayUnavailable(
    relayAvailability:
      RelayAvailability.NotConfigured | RelayAvailability.Refused,
  ) {
    this.#waitingKeys.clear();
    this.#outbox = [];
    this.#setState({ relayAvailability });
  }

  async #getConnectionToken(signal: AbortSignal) {
    const prefetchedToken = this.#prefetchedToken;
    this.#prefetchedToken = null;
    if (
      prefetchedToken !== null &&
      this.#timers.now() - prefetchedToken.requestedAt <=
        PREFETCHED_TOKEN_MAXIMUM_AGE_MILLISECONDS
    )
      return prefetchedToken.token;

    const { token } = await this.#options.requestConnectionToken(signal);
    return token;
  }

  #handleChannelState(state: ChannelState) {
    if (this.#isDisposed) return;

    if (this.#state.isRunning) {
      if (state.status === ChannelStatus.Connected)
        this.#isRelayWelcomed = true;

      const relayStopped = getRelayStopped(state);
      if (relayStopped !== null && relayStopped !== this.#relayStopped) {
        this.#relayStopped = relayStopped;
        this.#layer.setRelayStopped(relayStopped);
      }
    }

    this.#setState({ channel: state });
    void this.#runFirstUpload();
    this.#flushOutbox();
  }
}
