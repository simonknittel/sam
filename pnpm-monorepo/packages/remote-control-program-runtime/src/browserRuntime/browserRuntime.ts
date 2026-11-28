import {
  CapabilityId,
  CONNECTOR_CATALOG,
  ConnectorId,
  getOldestLogAnalyzerEntryVersion,
  LOG_ENTRIES_CAPABILITY,
  RelayCloseReason,
  RuntimeKind,
  type AnnounceContent,
  type FeedEntriesSource,
  type LogAnalyzerEntryType,
} from "@sam-monorepo/domain";
import { ChannelClient } from "../channel/channelClient.js";
import {
  ChannelStatus,
  DEFAULT_TIMERS,
  isProgramTurnedOff,
  type ChannelState,
  type ChannelTimers,
  type ConnectionTokenGrant,
  type CreateChannelWebSocket,
} from "../channel/channelTypes.js";
import {
  createLocalAccessLayer,
  RelayUploadState,
  type LocalAccessLayer,
  type LocalAccessSettings,
  type OlderEntriesTimeRange,
} from "../localAccess/localAccessLayer.js";
import type { LocalAccessStorage } from "../localAccess/localAccessStorage.js";
import type { EntryWindow, RawMatch } from "../logFile/types.js";
import {
  BrowserRuntimeError,
  BrowserRuntimeErrorCode,
  INITIAL_BROWSER_RUNTIME_STATE,
  type BrowserRuntimeState,
  type BrowserRuntimeStateListener,
  type PreparedOlderEntriesRequest,
} from "./browserRuntimeState.js";
import {
  createLogFolderReader,
  type LogFolderReader,
} from "./logFolderReader.js";
import { Outbox, OUTBOX_CHANNEL_ENTRY_LIMIT } from "./outbox.js";
import { OwnEntriesChangeMode, type OwnEntryStore } from "./ownEntryStore.js";
import { findRelayKeys, getTimeRange } from "./relayKeys.js";
import {
  readRunRecord,
  removeRunRecord,
  RUN_RECORD_INTERVAL_MILLISECONDS,
  RUN_RECORD_MAXIMUM_AGE_MILLISECONDS,
  writeRunRecord,
} from "./runRecord.js";

/**
 * The interval of the reads of the log folder, the same as the live mode of
 * the old Log Analyzer. A read takes only the new lines of `Game.log`. The
 * timers of a hidden tab can run only once each minute.
 */
export const LOG_FOLDER_READ_INTERVAL_MILLISECONDS = 10_000;

/**
 * A read that takes longer shows in `BrowserRuntimeState.isReading`. A read
 * of the new lines of the game takes less, thus the state does not change
 * each `LOG_FOLDER_READ_INTERVAL_MILLISECONDS`.
 */
const SLOW_READ_MILLISECONDS = 500;

const LOG_FILE_CONNECTOR = CONNECTOR_CATALOG[ConnectorId.LogFile];

const LOG_ENTRIES_SOURCE: FeedEntriesSource = {
  capability_id: CapabilityId.LogEntries,
  capability_version: LOG_ENTRIES_CAPABILITY.version,
  connector_id: ConnectorId.LogFile,
  connector_version: LOG_FILE_CONNECTOR.version,
};

export interface BrowserRuntimeOptions {
  /** The owner. Each citizen has own values in the storage. */
  readonly citizenId: string;
  /** The id that the browser keeps for the citizen (see `runtimeIdSchema`) */
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
   * `ConnectionTokenRefusedError` when it refuses the token (see
   * `ChannelClientOptions.getConnectionToken`).
   */
  readonly requestConnectionToken: (
    signal: AbortSignal,
  ) => Promise<ConnectionTokenGrant>;
  /** The Web Worker reader by default. The tests give a different reader. */
  readonly createLogFolderReader?: (
    folder: FileSystemDirectoryHandle,
  ) => LogFolderReader;
  /** The browser WebSocket by default */
  readonly createWebSocket?: CreateChannelWebSocket;
  /** `DEFAULT_TIMERS` by default */
  readonly timers?: ChannelTimers;
  /** The clock of the entries and of the reading */
  readonly now?: () => Date;
  /** `Math.random()` by default */
  readonly random?: () => number;
}

enum ReadOutcome {
  Completed = "completed",
  /** A different read or the end of the run stopped it */
  Stopped = "stopped",
  Failed = "failed",
}

interface FinishedRead {
  readonly outcome: ReadOutcome;
  /** See `LogFolderRead.failedFileCount`. Zero without a result of the reader. */
  readonly failedFileCount: number;
}

const FAILED_READ: FinishedRead = {
  outcome: ReadOutcome.Failed,
  failedFileCount: 0,
};

const STOPPED_READ: FinishedRead = {
  outcome: ReadOutcome.Stopped,
  failedFileCount: 0,
};

interface OlderEntriesRequest {
  readonly id: string;
  readonly range: OlderEntriesTimeRange;
  readonly entries: readonly RawMatch[];
  readonly countsByType: ReadonlyMap<LogAnalyzerEntryType, number>;
}

const countByRuleType = (entries: readonly RawMatch[]) => {
  const countsByType = new Map<LogAnalyzerEntryType, number>();
  for (const entry of entries) {
    const ruleType = getOldestLogAnalyzerEntryVersion(entry.type);
    countsByType.set(ruleType, (countsByType.get(ruleType) ?? 0) + 1);
  }
  return countsByType;
};

/**
 * The state of the relay for the local access layer. Null: the channel state
 * does not tell it, for example during a reconnect.
 *
 * The Unleash flag of the organization stops the uploads. An automatic upload
 * after the program is on again does not send the entries of the time in
 * which it was off (decision 27 of the concept).
 */
const getRelayUploadState = (state: ChannelState): RelayUploadState | null => {
  if (isProgramTurnedOff(state)) return RelayUploadState.Stopped;

  switch (state.status) {
    case ChannelStatus.Connected:
      return RelayUploadState.Accepting;

    // The newer connection of the same runtime continues
    case ChannelStatus.Ended:
      return state.closeReason === RelayCloseReason.Replaced
        ? null
        : RelayUploadState.Ended;

    case ChannelStatus.Idle:
    case ChannelStatus.Connecting:
    case ChannelStatus.WaitingForReconnect:
      return null;

    default:
      throw new Error(
        `Unknown channel status: ${state.status satisfies never}`,
      );
  }
};

/**
 * The browser runtime of the tab that holds the Web Lock of the citizen in
 * this browser (see `docs/remote-control-program/README.md#browser-runtime`).
 * It combines the log file connector, the local access layer and the channel
 * client:
 *
 * - It reads the log folder each `LOG_FOLDER_READ_INTERVAL_MILLISECONDS`
 *   while it runs, and keeps the own entries in the entry store.
 * - It connects to the relay while it runs, when the app has a relay.
 * - An entry goes up automatically only when the local access layer permits
 *   it (decision 27): the runtime read it live, from the start of this run.
 *   The entries that wait for the connection to the relay stay in the
 *   outbox, only in memory, and go up after the reconnect. A stop, a
 *   different log folder, a closed tab or an ended connection loses them.
 * - Older entries go up only through a request that the owner confirms. The
 *   runtime sends only the entries that the relay does not have
 *   (`ChannelClient.requestOwnEntryKeys()`).
 *
 * Make one runtime when the tab gets the Web Lock, and call `handOver()` when
 * the tab loses it or closes, or `endSession()` when the user logs out.
 */
export class BrowserRuntime {
  readonly #options: BrowserRuntimeOptions;
  readonly #timers: ChannelTimers;
  readonly #now: () => Date;
  readonly #entryStore: OwnEntryStore;
  readonly #channel: ChannelClient;
  readonly #listeners = new Set<BrowserRuntimeStateListener>();
  /**
   * The running state of the previous runtime of the citizen in this browser
   * when it ended a short time before. Null: no runtime ran a short time
   * before.
   */
  readonly #previousIsRunning: boolean | null;
  readonly #unsubscribeChannel: () => void;
  #state: BrowserRuntimeState;
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
  #readInFlight: Promise<FinishedRead> | null = null;
  #isReadRequested = false;
  #cancelReadTimer: (() => void) | null = null;
  #cancelRunRecordTimer: (() => void) | null = null;

  /** The value that the layer got last */
  #relayState = RelayUploadState.Unknown;
  /** The relay sent the `welcome` in this run */
  #isRelayWelcomed = false;
  readonly #outbox = new Outbox();
  #isFlushingOutbox = false;
  #olderEntriesRequest: OlderEntriesRequest | null = null;
  #newestRequestNumber = 0;

  constructor(options: BrowserRuntimeOptions) {
    this.#options = options;
    this.#timers = options.timers ?? DEFAULT_TIMERS;
    this.#now = options.now ?? (() => new Date());
    this.#entryStore = options.entryStore;
    this.#layer = this.#createLayer();

    this.#channel = new ChannelClient({
      runtimeId: options.runtimeId,
      runtimeKind: RuntimeKind.browser,
      runtimeVersion: options.runtimeVersion,
      announcement: this.#createAnnouncement(),
      getConnectionToken: options.requestConnectionToken,
      selectPermittedEntries: (_source, entries) =>
        this.#layer.selectPermittedUploads(entries),
      createWebSocket: options.createWebSocket,
      timers: options.timers,
      random: options.random,
    });
    this.#state = {
      ...INITIAL_BROWSER_RUNTIME_STATE,
      channel: this.#channel.getState(),
    };
    this.#unsubscribeChannel = this.#channel.subscribe((state) =>
      this.#handleChannelState(state),
    );

    const previousRecord = readRunRecord(options.storage, options.citizenId);
    this.#previousIsRunning =
      previousRecord !== null &&
      this.#now().getTime() - previousRecord.updatedAt <=
        RUN_RECORD_MAXIMUM_AGE_MILLISECONDS
        ? previousRecord.isRunning
        : null;

    this.#scheduleRunRecord();
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
   * Whether this runtime starts after it took over: it takes the state of a
   * runtime of the same citizen that ended a short time before (for example
   * the closed tab of the previous runtime, or a reload): running or waiting
   * for a start, or stopped. Else it obeys the autostart. A start reads live
   * from its own time, also after a change of the active tab.
   */
  shouldRun(isAutostartEnabled: boolean) {
    return this.#previousIsRunning ?? isAutostartEnabled;
  }

  /**
   * Reads the folder, and reads live from now on. The tab must have the read
   * permission for it. A different handle object counts as a different folder
   * and replaces the entries: give the same object again for the same folder.
   */
  start(folder: FileSystemDirectoryHandle) {
    if (this.#isDisposed) return;
    if (this.#state.isRunning) {
      if (folder === this.#folder) return;
      // The owner selected a different folder: the start with it reads live from its own time
      this.#stopReading();
    }

    if (folder !== this.#folder) this.#useFolder(folder);

    this.#runGeneration += 1;
    this.#layer = this.#createLayer();
    this.#relayState = RelayUploadState.Unknown;
    this.#isRelayWelcomed = false;
    this.#isWaitingForStart = false;
    this.#setState({ isRunning: true, error: null });

    this.#layer.startReading();
    this.#channel.updateAnnouncement(this.#createAnnouncement());
    // Also after a refused token or a missing relay: a new start tries again
    this.#channel.connect();

    this.#writeRunRecord();
    void this.#read();
  }

  /**
   * The owner stops the runtime, or the tab lost the access to the folder.
   * The entries that wait for the connection are lost, and a next start reads
   * live from its own time: the entries of the stopped time stay on the
   * machine (decision 27 of the concept). The next runtime of the citizen in
   * this browser stays stopped.
   */
  stop() {
    if (this.#isDisposed) return;

    this.#isWaitingForStart = false;
    if (this.#state.isRunning) this.#stopReading();
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
   * The tab loses the runtime, for example when it closes. The entries that
   * wait for the connection are lost. The next runtime takes the state of
   * this runtime (see `shouldRun()`), and reads live from its own start.
   */
  handOver() {
    if (this.#isDisposed) return;

    const shouldRun = this.#state.isRunning || this.#isWaitingForStart;
    if (this.#state.isRunning) this.#stopReading();
    this.#writeRunRecord(shouldRun);
    this.#dispose();
  }

  /**
   * The user logs out. The runtime stops like after `stop()`, but the next
   * runtime of the citizen obeys the autostart again.
   */
  endSession() {
    if (this.#isDisposed) return;

    this.#isWaitingForStart = false;
    if (this.#state.isRunning) this.#stopReading();
    removeRunRecord(this.#options.storage, this.#options.citizenId);
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

  /**
   * After a change of the settings of the local access layer, also in a
   * different tab (the `storage` event)
   */
  handleLocalAccessChange() {
    if (this.#isDisposed) return;

    this.#channel.updateAnnouncement(this.#createAnnouncement());
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
    this.#newestRequestNumber += 1;
    const requestNumber = this.#newestRequestNumber;

    /** Only the newest request counts, and only in the run of its start */
    const requireCurrentRequest = () => {
      if (generation !== this.#runGeneration)
        throw new BrowserRuntimeError(BrowserRuntimeErrorCode.NotRunning);
      if (requestNumber !== this.#newestRequestNumber)
        throw new BrowserRuntimeError(BrowserRuntimeErrorCode.RequestExpired);
    };

    // A new window of a control UI stops a read, thus the count would miss entries
    let read: FinishedRead;
    do {
      read = await this.#readNow([range]);
      requireCurrentRequest();
    } while (read.outcome === ReadOutcome.Stopped);
    if (read.outcome === ReadOutcome.Failed)
      throw new BrowserRuntimeError(BrowserRuntimeErrorCode.ReadFailed);
    // Like in the desktop companion. The warning has no paths: they can contain the name of the user.
    if (read.failedFileCount > 0)
      console.warn(
        `[Remote Control Program] The count of older entries is without the entries of the log files that could not be read: ${read.failedFileCount}`,
      );

    const { prunedUntil } = this.#entryStore;
    if (
      prunedUntil !== null &&
      (range.start === null || range.start <= new Date(prunedUntil))
    )
      throw new BrowserRuntimeError(BrowserRuntimeErrorCode.TooManyEntries);

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
      requireCurrentRequest();

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

    const entries = this.#layer.selectPermittedUploads(request.entries);
    this.#enqueue(entries, true);
    return entries.length;
  }

  #createLayer() {
    return createLocalAccessLayer({
      storage: this.#options.storage,
      citizenId: this.#options.citizenId,
      now: this.#now,
    });
  }

  #setState(changes: Partial<BrowserRuntimeState>) {
    this.#state = { ...this.#state, ...changes };
    for (const listener of this.#listeners) listener(this.#state);
  }

  /** False when the channel ended: no relay, or a refused token */
  #canUpload() {
    return this.#channel.getState().status !== ChannelStatus.Ended;
  }

  #requireUploads() {
    if (!this.#state.isRunning)
      throw new BrowserRuntimeError(BrowserRuntimeErrorCode.NotRunning);
    if (!this.#canUpload())
      throw new BrowserRuntimeError(BrowserRuntimeErrorCode.RelayNotAvailable);
  }

  #writeRunRecord(
    isRunning = this.#state.isRunning || this.#isWaitingForStart,
  ) {
    writeRunRecord(this.#options.storage, this.#options.citizenId, {
      isRunning,
      updatedAt: this.#now().getTime(),
    });
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
      this.#entryStore.apply({
        mode: OwnEntriesChangeMode.Replace,
        entries: [],
      });
      this.#setState({ newestLogLineAt: null, oldestSessionStart: null });
    }
  }

  /**
   * The entries that wait in the outbox and in the queue of the channel
   * client are lost
   */
  #stopReading() {
    this.#runGeneration += 1;
    this.#cancelReadTimer?.();
    this.#cancelReadTimer = null;
    this.#reader?.stopRead();
    this.#layer.stopReading();
    this.#outbox.clear();

    this.#channel.disconnect();
    this.#olderEntriesRequest = null;
    this.#setState({ isRunning: false, isReading: false });
  }

  #dispose() {
    this.#isDisposed = true;
    this.#cancelRunRecordTimer?.();
    this.#cancelRunRecordTimer = null;
    this.#reader?.dispose();
    this.#reader = null;
    this.#unsubscribeChannel();
    this.#channel.disconnect();
    this.#listeners.clear();
  }

  #scheduleRunRecord() {
    this.#cancelRunRecordTimer = this.#timers.schedule(() => {
      this.#cancelRunRecordTimer = null;
      if (this.#isDisposed) return;

      // A storage that the user blocked throws
      try {
        this.#writeRunRecord();
      } catch (error) {
        console.error(
          "[Remote Control Program] Error writing the run record:",
          error,
        );
      }
      this.#scheduleRunRecord();
    }, RUN_RECORD_INTERVAL_MILLISECONDS);
  }

  /**
   * The live window starts at the time since which the runtime reads live:
   * the entries that can go up automatically are not older. The selection of
   * the log files by the window still reads the rest of a `Game.log` that the
   * game moved into `logbackups/`.
   */
  #getReadWindows(): EntryWindow[] {
    const liveWindow: EntryWindow = {
      start: this.#layer.getReadsLiveSince() ?? this.#now(),
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
    // Two callers can wait for the same read: the second one must not take the read of the first one as its own
    while (this.#readInFlight !== null) {
      this.#reader?.stopRead();
      await this.#readInFlight;
    }

    this.#oneTimeWindows = oneTimeWindows;
    return this.#read();
  }

  async #readOnce(generation: number): Promise<FinishedRead> {
    const reader = this.#reader;
    if (!reader || !this.#state.isRunning) return FAILED_READ;

    const windows = this.#getReadWindows();
    this.#oneTimeWindows = [];

    const cancelSlowReadTimer = this.#timers.schedule(() => {
      if (generation === this.#runGeneration)
        this.#setState({ isReading: true });
    }, SLOW_READ_MILLISECONDS);

    try {
      const result = await reader.read(windows);
      // The entries of a different folder, or the runtime ended
      if (reader !== this.#reader) return STOPPED_READ;

      const { entries: addedEntries } = this.#entryStore.apply({
        mode: OwnEntriesChangeMode.Append,
        entries: result.matches,
      });

      // A read of an older window must not move the time back
      const newestLogLineAt =
        result.newestIsoDate === null ? null : new Date(result.newestIsoDate);
      const previousNewestLogLineAt = this.#state.newestLogLineAt;

      this.#setState({
        newestLogLineAt:
          previousNewestLogLineAt !== null &&
          (newestLogLineAt === null ||
            previousNewestLogLineAt >= newestLogLineAt)
            ? previousNewestLogLineAt
            : newestLogLineAt,
        oldestSessionStart: result.oldestSessionStart,
        isReading: false,
        error: result.hasEnvironmentFolder
          ? null
          : BrowserRuntimeErrorCode.NoEnvironmentFolder,
      });

      const { failedFileCount } = result;
      /**
       * A read that ends after a stop also adds its entries to the store: the
       * reader does not give them again, and a request for older entries
       * offers them. They do not go up automatically, because the run that
       * read them stopped (decision 27 of the concept).
       */
      if (generation !== this.#runGeneration)
        return { outcome: ReadOutcome.Stopped, failedFileCount };

      this.#handleReadEntries(addedEntries);
      return {
        outcome: result.isStopped ? ReadOutcome.Stopped : ReadOutcome.Completed,
        failedFileCount,
      };
    } catch (error) {
      if (reader !== this.#reader) return STOPPED_READ;

      console.error(
        "[Remote Control Program] Error reading the log folder:",
        error,
      );
      this.#setState({
        isReading: false,
        error: BrowserRuntimeErrorCode.ReadFailed,
      });
      return generation === this.#runGeneration ? FAILED_READ : STOPPED_READ;
    } finally {
      cancelSlowReadTimer();
    }
  }

  /**
   * The new entries that go up automatically wait in the outbox until the
   * channel has the `welcome` and space
   */
  #handleReadEntries(addedEntries: readonly RawMatch[]) {
    if (!this.#canUpload()) return;

    this.#enqueue(this.#layer.selectAutomaticUploads(addedEntries), false);
  }

  /**
   * Through the connection to the relay. The check waits for a reconnect
   * after a short loss of the connection, and fails without a connection:
   * then no entry goes up either.
   */
  #findRelayKeys(range: { readonly start: Date; readonly end: Date }) {
    return findRelayKeys(
      (query) => this.#channel.requestOwnEntryKeys(query),
      range,
    );
  }

  #enqueue(entries: readonly RawMatch[], isConfirmed: boolean) {
    if (entries.length === 0) return;

    this.#outbox.add(entries, isConfirmed);
    this.#flushOutbox();
  }

  /**
   * Gives the channel client the next entries of the outbox, until its queue
   * holds `OUTBOX_CHANNEL_ENTRY_LIMIT` entries. Each `ack` of the relay
   * changes the channel state and calls it again.
   */
  #flushOutbox() {
    if (this.#isFlushingOutbox || !this.#isRelayWelcomed) return;

    // The channel client calls the state listener during the send
    this.#isFlushingOutbox = true;
    try {
      while (this.#outbox.size > 0) {
        const space =
          OUTBOX_CHANNEL_ENTRY_LIMIT -
          this.#channel.getState().queuedEntryCount;
        if (space <= 0) break;

        const entries = this.#outbox.takeSendableEntries(space, this.#layer);
        if (entries.length > 0)
          this.#channel.sendFeedEntries({ ...LOG_ENTRIES_SOURCE, entries });
      }
    } finally {
      this.#isFlushingOutbox = false;
    }
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

  #handleChannelState(state: ChannelState) {
    if (this.#isDisposed) return;

    if (this.#state.isRunning) {
      if (state.status === ChannelStatus.Connected)
        this.#isRelayWelcomed = true;

      const relayState = getRelayUploadState(state);
      if (relayState !== null && relayState !== this.#relayState) {
        this.#relayState = relayState;
        this.#layer.setRelayState(relayState);
      }
    }

    // No entry goes up: the runtime does not keep them for the upload
    if (state.status === ChannelStatus.Ended) this.#outbox.clear();

    this.#setState({ channel: state });
    this.#flushOutbox();
  }
}
