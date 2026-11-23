import {
  type AnnounceContent,
  CapabilityId,
  getOldestLogAnalyzerEntryVersion,
  LogAnalyzerEntryType,
} from "@sam-monorepo/domain";
import {
  continueOrStartPeriod,
  endLastPeriod,
  isInLivePeriod,
  type LivePeriods,
  OWN_HEARTBEAT_GAP_MILLISECONDS,
  pruneLivePeriods,
  TAB_CHANGE_GAP_MILLISECONDS,
} from "./livePeriods.js";
import {
  LEGACY_SHARE_TYPES_STORAGE_KEY,
  type LocalAccessRules,
  type LocalAccessStorage,
  readLivePeriods,
  readLocalAccessRules,
  writeLivePeriods,
  writeLocalAccessRules,
} from "./localAccessStorage.js";

/**
 * The parts of a log entry that the rules read. `RawMatch` of the log file
 * connector has them.
 */
export interface LocalAccessEntry {
  readonly type: LogAnalyzerEntryType;
  /** The time of the entry in ISO 8601 */
  readonly isoDate: string;
}

/** `end` is exclusive. Null is no limit. */
export interface OlderEntriesTimeRange {
  readonly start: Date | null;
  readonly end: Date | null;
}

/** The prepared request for older entries, which the owner confirms */
export interface OlderEntriesRequest<Entry extends LocalAccessEntry> {
  readonly range: OlderEntriesTimeRange;
  /**
   * The entries of the range whose types are on and which do not go up
   * automatically
   */
  readonly entries: readonly Entry[];
  /** The number of entries for each type, by the oldest version of the type */
  readonly countsByType: ReadonlyMap<LogAnalyzerEntryType, number>;
}

/** The settings of this browser, for the sharing popover */
export interface LocalAccessSettings {
  /** Each version of a type has the value of the rule of its oldest version */
  readonly logEntryTypes: Readonly<Record<LogAnalyzerEntryType, boolean>>;
  /** The time of the "Stop all" of this browser. Null when it is not active. */
  readonly stoppedAt: Date | null;
}

export interface LocalAccessLayerOptions {
  readonly storage: LocalAccessStorage;
  /** The clock. The tests give their own clock. */
  readonly now?: () => Date;
}

/**
 * One rule for all versions of a type, see
 * `LocalAccessRules.turnedOnAtByType`
 */
const RULE_TYPES = Array.from(
  new Set(
    Object.values(LogAnalyzerEntryType).map(getOldestLogAnalyzerEntryVersion),
  ),
);

/**
 * NaN for a text that is not a valid time. NaN is in no period and in no
 * range.
 */
const getEntryTime = (entry: LocalAccessEntry) => Date.parse(entry.isoDate);

const isInRange = (time: number, range: OlderEntriesTimeRange) =>
  (range.start === null || time >= range.start.getTime()) &&
  (range.end === null || time < range.end.getTime());

/**
 * The local access layer of the browser runtime (see "Local access layer" of
 * `docs/remote-control-program/README.md`): the rules of `log_entries` for
 * each log entry type, the "Stop all" of this browser, and the rule for the
 * upload (decision 27).
 *
 * All is off by default. A log entry goes up automatically only when:
 *
 * - its type is on, and was on at the time of the entry,
 * - its time is in a live period (see `livePeriods.ts`),
 * - the "Stop all" of this browser is not active, and the relay told that
 *   the "Stop all" of the owner is not active.
 *
 * Older entries go up only through a request that the owner confirms
 * (`prepareOlderEntriesRequest` and `confirmOlderEntriesRequest`).
 *
 * Each tab can make a layer on the same storage. The values in the storage
 * are the source of truth: each method reads them again. Only the tab with
 * the running runtime (the holder of the Web Lock) calls the methods of the
 * reading (`startReading`, `heartbeat`, `stopReading`, `setRelayStopped`).
 *
 * The layer removes the share settings of the old Log Analyzer (M1).
 */
export const createLocalAccessLayer = ({
  storage,
  now = () => new Date(),
}: LocalAccessLayerOptions) => {
  storage.removeItem(LEGACY_SHARE_TYPES_STORAGE_KEY);

  /** The runtime of this tab reads the log */
  let isReading = false;
  /**
   * The "Stop all" of the owner from the relay. Null until the first
   * `welcome`: before it, no period starts, because the relay can have a
   * "Stop all" that this tab does not know.
   */
  let isRelayStopped: boolean | null = null;
  /** The runtime of this tab extends the last period with its heartbeats */
  let isOwnPeriodOpen = false;

  const getTime = () => now().getTime();

  const readPeriods = (time: number) =>
    pruneLivePeriods(readLivePeriods(storage), time);

  /** False when a "Stop all" of a different tab ended the own period */
  const isLastPeriodOpen = (livePeriods: LivePeriods, time: number) => {
    const lastPeriod = livePeriods.periods.at(-1);

    return (
      isOwnPeriodOpen &&
      livePeriods.canContinueLastPeriod &&
      lastPeriod !== undefined &&
      time - lastPeriod.endedAt <= OWN_HEARTBEAT_GAP_MILLISECONDS
    );
  };

  const goesUpAutomatically = (
    rules: LocalAccessRules,
    livePeriods: LivePeriods,
    isOpen: boolean,
    entry: LocalAccessEntry,
  ) => {
    const turnedOnAt = rules.turnedOnAtByType.get(
      getOldestLogAnalyzerEntryVersion(entry.type),
    );
    if (turnedOnAt === undefined) return false;

    const time = getEntryTime(entry);
    return time >= turnedOnAt && isInLivePeriod(livePeriods, time, isOpen);
  };

  /**
   * Brings the stored periods in line with the reading, the stops and the
   * clock
   */
  const updatePeriods = () => {
    const time = getTime();
    const rules = readLocalAccessRules(storage);
    const livePeriods = readPeriods(time);

    const isOpenWanted =
      isReading && rules.stoppedAt === null && isRelayStopped === false;
    const isOwnPeriodStillOpen =
      isOwnPeriodOpen && livePeriods.canContinueLastPeriod;
    const gapLimit = isOwnPeriodStillOpen
      ? OWN_HEARTBEAT_GAP_MILLISECONDS
      : TAB_CHANGE_GAP_MILLISECONDS;

    let nextLivePeriods = livePeriods;
    if (isOpenWanted) {
      nextLivePeriods = continueOrStartPeriod(livePeriods, time, gapLimit);
    } else if (isOwnPeriodStillOpen) {
      // Only the end of the reading lets a next runtime continue the period
      nextLivePeriods = endLastPeriod(
        livePeriods,
        rules.stoppedAt ?? time,
        gapLimit,
        rules.stoppedAt === null && isRelayStopped === false,
      );
    } else if (rules.stoppedAt !== null) {
      // A "Stop all" in a tab that does not extend the period: no runtime can continue it
      nextLivePeriods = { ...livePeriods, canContinueLastPeriod: false };
    }

    isOwnPeriodOpen = isOpenWanted;
    writeLivePeriods(storage, pruneLivePeriods(nextLivePeriods, time));
  };

  return {
    getSettings: (): LocalAccessSettings => {
      const rules = readLocalAccessRules(storage);

      return {
        logEntryTypes: Object.fromEntries(
          Object.values(LogAnalyzerEntryType).map((type) => [
            type,
            rules.turnedOnAtByType.has(getOldestLogAnalyzerEntryVersion(type)),
          ]),
        ) as Record<LogAnalyzerEntryType, boolean>,
        stoppedAt: rules.stoppedAt === null ? null : new Date(rules.stoppedAt),
      };
    },

    /**
     * Turns the given types on or off. A type that turns on goes up
     * automatically only with the entries from this time. A type that turns
     * off loses its time: when it turns on again, its entries from before go
     * up only on an explicit request.
     */
    setLogEntryTypes: (
      types: readonly LogAnalyzerEntryType[],
      isOn: boolean,
    ) => {
      const time = getTime();
      const rules = readLocalAccessRules(storage);

      const turnedOnAtByType = new Map(rules.turnedOnAtByType);
      for (const type of types) {
        const ruleType = getOldestLogAnalyzerEntryVersion(type);

        if (!isOn) {
          turnedOnAtByType.delete(ruleType);
        } else if (!turnedOnAtByType.has(ruleType)) {
          turnedOnAtByType.set(ruleType, time);
        }
      }

      writeLocalAccessRules(storage, { ...rules, turnedOnAtByType });
    },

    /**
     * The "Stop all" of this browser: no upload until `startAll`. The time of
     * the stop stays a gap in the live periods.
     */
    stopAll: () => {
      const rules = readLocalAccessRules(storage);
      if (rules.stoppedAt !== null) return;

      writeLocalAccessRules(storage, { ...rules, stoppedAt: getTime() });
      updatePeriods();
    },

    /** Ends the "Stop all" of this browser. A new live period starts. */
    startAll: () => {
      const rules = readLocalAccessRules(storage);
      if (rules.stoppedAt === null) return;

      writeLocalAccessRules(storage, { ...rules, stoppedAt: null });
      updatePeriods();
    },

    /** The summary for the `announce` message */
    getAnnouncementSummary: (): AnnounceContent["local_access_layer"] => {
      const rules = readLocalAccessRules(storage);
      const onCount = RULE_TYPES.filter((type) =>
        rules.turnedOnAtByType.has(type),
      ).length;

      return {
        is_stopped: rules.stoppedAt !== null,
        capability_rules: [
          {
            capability_id: CapabilityId.LogEntries,
            is_on: onCount > 0,
            is_filtered: onCount > 0 && onCount < RULE_TYPES.length,
          },
        ],
      };
    },

    /**
     * The runtime of this tab starts to read the log (it has the access to
     * the folder)
     */
    startReading: () => {
      isReading = true;
      updatePeriods();
    },

    /**
     * Each `LIVE_PERIOD_HEARTBEAT_INTERVAL_MILLISECONDS` while the runtime of
     * this tab reads. Also after a change of the settings in a different tab
     * (the `storage` event), so that a `startAll` there starts the period
     * immediately.
     */
    heartbeat: () => {
      updatePeriods();
    },

    /**
     * The runtime of this tab stops to read: the owner stops it, the tab
     * loses the Web Lock, or the tab closes (`pagehide`). A next runtime can
     * continue the period.
     */
    stopReading: () => {
      isReading = false;
      updatePeriods();
    },

    /**
     * The "Stop all" of the owner from the relay: `is_stopped` of each
     * `welcome`, and each `stop` and `start`
     */
    setRelayStopped: (isStopped: boolean) => {
      isRelayStopped = isStopped;
      updatePeriods();
    },

    /**
     * The entries that go up automatically now. Call it for the entries of
     * each read, and again for the waiting entries before each send: a
     * "Stop all" or a type that turned off stops them.
     */
    selectAutomaticUploads: <Entry extends LocalAccessEntry>(
      entries: Iterable<Entry>,
    ): Entry[] => {
      const rules = readLocalAccessRules(storage);
      if (rules.stoppedAt !== null || isRelayStopped !== false) return [];

      const time = getTime();
      const livePeriods = readPeriods(time);
      const isOpen = isLastPeriodOpen(livePeriods, time);

      return Array.from(entries).filter((entry) =>
        goesUpAutomatically(rules, livePeriods, isOpen, entry),
      );
    },

    /**
     * The request for the older entries of a time range: the entries whose
     * types are on and which do not go up automatically. The caller can
     * leave out the entries that the relay already has.
     */
    prepareOlderEntriesRequest: <Entry extends LocalAccessEntry>(
      entries: Iterable<Entry>,
      range: OlderEntriesTimeRange,
    ): OlderEntriesRequest<Entry> => {
      const time = getTime();
      const rules = readLocalAccessRules(storage);
      const livePeriods = readPeriods(time);
      const isOpen = isLastPeriodOpen(livePeriods, time);

      const requestedEntries: Entry[] = [];
      const countsByType = new Map<LogAnalyzerEntryType, number>();

      for (const entry of entries) {
        const ruleType = getOldestLogAnalyzerEntryVersion(entry.type);

        if (
          !rules.turnedOnAtByType.has(ruleType) ||
          !isInRange(getEntryTime(entry), range) ||
          goesUpAutomatically(rules, livePeriods, isOpen, entry)
        )
          continue;

        requestedEntries.push(entry);
        countsByType.set(ruleType, (countsByType.get(ruleType) ?? 0) + 1);
      }

      return { range, entries: requestedEntries, countsByType };
    },

    /**
     * The entries to upload after the confirmation of the owner. Only the
     * types that are still on go up. Nothing goes up while the "Stop all" of
     * this browser is active, or the relay told that the "Stop all" of the
     * owner is active.
     */
    confirmOlderEntriesRequest: <Entry extends LocalAccessEntry>(
      request: OlderEntriesRequest<Entry>,
    ): Entry[] => {
      const rules = readLocalAccessRules(storage);
      if (rules.stoppedAt !== null || isRelayStopped === true) return [];

      return request.entries.filter((entry) =>
        rules.turnedOnAtByType.has(
          getOldestLogAnalyzerEntryVersion(entry.type),
        ),
      );
    },
  };
};

export type LocalAccessLayer = ReturnType<typeof createLocalAccessLayer>;
