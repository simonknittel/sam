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
  isSourceTurnedOff,
  type ChannelState,
  type ChannelTimers,
  type ConnectionTokenGrant,
  type CreateChannelWebSocket,
} from "../channel/channelTypes.js";
import {
  LIVE_PERIOD_HEARTBEAT_INTERVAL_MILLISECONDS,
  LIVE_PERIOD_RETENTION_MILLISECONDS,
  TAB_CHANGE_GAP_MILLISECONDS,
} from "../localAccess/livePeriods.js";
import {
  createLocalAccessLayer,
  RelayUploadState,
  type LocalAccessLayer,
  type LocalAccessSettings,
  type OlderEntriesTimeRange,
  type StopReadingOptions,
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
import {
  findRelayKeys,
  getTimeRange,
  type FindOwnEntryKeys,
} from "./relayKeys.js";
import { readRunRecord, removeRunRecord, writeRunRecord } from "./runRecord.js";

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
 * The delay before the next try of the check of the relay after a failed
 * check. The runtime tries again after the next read after the delay.
 */
const RELAY_CHECK_RETRY_DELAY_MILLISECONDS = 60_000;

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
  /**
   * Gives the keys of the own entries that the relay has. It must end in a
   * short time (the app uses a timeout).
   */
  readonly findOwnEntryKeys: FindOwnEntryKeys;
  /** The Web Worker reader by default. The tests give a different reader. */
  readonly createLogFolderReader?: (
    folder: FileSystemDirectoryHandle,
  ) => LogFolderReader;
  /** The browser WebSocket by default */
  readonly createWebSocket?: CreateChannelWebSocket;
  /** `DEFAULT_TIMERS` by default */
  readonly timers?: ChannelTimers;
  /** The clock of the entries and of the live periods */
  readonly now?: () => Date;
  /** `Math.random()` by default */
  readonly random?: () => number;
}

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
 * A part that the switches turned off stops the uploads. An automatic upload
 * after the part is on again does not send the entries of the time in which
 * it was off (decision 27 of the concept).
 */
const getRelayUploadState = (state: ChannelState): RelayUploadState | null => {
  if (isSourceTurnedOff(state, LOG_ENTRIES_SOURCE))
    return RelayUploadState.Stopped;

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
 *   it (decision 27), and only one time. After a start (also after a change
 *   of the active tab), the first read offers the entries of the stored live
 *   periods again. The runtime sends only the entries that the relay does not
 *   have (`findOwnEntryKeys`).
 * - Older entries go up only through a request that the owner confirms.
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
  readonly #unsubscribeEntryStore: () => void;
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
  #readInFlight: Promise<void> | null = null;
  #isReadRequested = false;
  #cancelReadTimer: (() => void) | null = null;
  #cancelPresenceTimer: (() => void) | null = null;

  /** The value that the layer got last */
  #relayState = RelayUploadState.Unknown;
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
  readonly #outbox = new Outbox();
  #isFlushingOutbox = false;
  #olderEntriesRequest: OlderEntriesRequest | null = null;

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
   * of a runtime of the same citizen that ended a short time before (for
   * example the closed tab of the previous runtime, or a reload): running or
   * waiting for a start, or stopped. Else it obeys the autostart.
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
    this.#relayState = RelayUploadState.Unknown;
    this.#isRelayWelcomed = false;
    this.#hasCompletedRead = false;
    this.#isFirstUploadDone = false;
    this.#nextRelayCheckAt = 0;
    this.#isWaitingForStart = false;
    this.#setState({ isRunning: true, error: null });

    this.#layer.startReading();
    this.#channel.updateAnnouncement(this.#createAnnouncement());
    // Also after a refused token or a missing relay: a new start tries again
    this.#channel.connect();
    // The entries of the previous runtime or of the previous run can be in
    // the live periods and wait for their upload
    for (const entry of this.#entryStore.values())
      this.#waitingKeys.add(entry.hash);

    this.#writeRunRecord();
    void this.#read();
  }

  /**
   * The owner stops the runtime, or the tab lost the access to the folder.
   * The live period ends without a continuation: a next start, also within
   * `TAB_CHANGE_GAP_MILLISECONDS`, starts a new period, and the entries of
   * the stopped time stay on the machine (decision 27 of the concept). The
   * next runtime of the citizen in this browser stays stopped.
   */
  stop() {
    if (this.#isDisposed) return;

    this.#isWaitingForStart = false;
    this.#endReading();
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
   * The user logs out. The runtime stops like after `stop()`, without a
   * continuation, but the next runtime of the citizen obeys the autostart
   * again.
   */
  endSession() {
    if (this.#isDisposed) return;

    this.#isWaitingForStart = false;
    this.#endReading();
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

    if (this.#state.isRunning) this.#layer.heartbeat();
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
        relayKeys = await findRelayKeys(
          this.#options.findOwnEntryKeys,
          timeRange,
        );
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
      // The live periods are the times of the previous folder
      this.#layer.removeLivePeriods();
      this.#waitingKeys.clear();
      this.#entryStore.apply({
        mode: OwnEntriesChangeMode.Replace,
        entries: [],
      });
      this.#setState({ newestLogLineAt: null, logSelection: null });
    }
  }

  /** Ends the reading without a continuation, also when it does not read */
  #endReading() {
    if (this.#state.isRunning) {
      this.#stopReading({ canContinue: false });
    } else {
      // A runtime that did not read yet must not let a next start continue the period of the previous runtime
      this.#layer.stopReading({ canContinue: false });
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
    this.#reader?.stopRead();
    this.#layer.stopReading(options);

    this.#channel.disconnect();
    this.#olderEntriesRequest = null;
    this.#setState({ isRunning: false, readProgress: null });
  }

  #dispose() {
    this.#isDisposed = true;
    this.#cancelPresenceTimer?.();
    this.#cancelPresenceTimer = null;
    this.#reader?.dispose();
    this.#reader = null;
    this.#unsubscribeChannel();
    this.#channel.disconnect();
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

      // A storage that the user blocked throws also at a read
      try {
        if (this.#state.isRunning) this.#layer.heartbeat();
        this.#writeRunRecord();
      } catch (error) {
        console.error(
          "[Remote Control Program] Error in the heartbeat:",
          error,
        );
      }
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
   * the `welcome`, the layer does not know the switches.
   */
  async #runFirstUpload() {
    if (
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
    if (
      timeRange !== null &&
      !isSourceTurnedOff(this.#channel.getState(), LOG_ENTRIES_SOURCE)
    ) {
      this.#isFirstUploadRunning = true;
      let relayKeys: Set<string>;
      try {
        relayKeys = await findRelayKeys(
          this.#options.findOwnEntryKeys,
          timeRange,
        );
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
    if (state.status === ChannelStatus.Ended) {
      this.#waitingKeys.clear();
      this.#outbox.clear();
    }

    this.#setState({ channel: state });
    void this.#runFirstUpload();
    this.#flushOutbox();
  }
}
