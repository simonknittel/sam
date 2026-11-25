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
  NO_LIVE_PERIODS,
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
}

export interface StopReadingOptions {
  /** Only a change of the active tab lets a next runtime continue the period */
  readonly canContinue: boolean;
}

/** What the relay told the runtime of this tab about the uploads */
export enum RelayUploadState {
  /**
   * The runtime did not get the `welcome` of this run yet: no period starts,
   * because the relay can have a switch that the runtime does not know
   */
  Unknown = "unknown",
  /** The relay accepts the uploads */
  Accepting = "accepting",
  /**
   * A switch turned off the capability. It removes all periods.
   */
  Stopped = "stopped",
  /**
   * The connection ended without a new attempt (for example a refused token
   * or no relay): the period ends without a continuation
   */
  Ended = "ended",
}

export interface LocalAccessLayerOptions {
  readonly storage: LocalAccessStorage;
  /** The owner: each citizen has own values in the storage */
  readonly citizenId: string;
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
 * each log entry type, and the rule for the upload (decision 27).
 *
 * All is off by default. A log entry goes up automatically only when:
 *
 * - its type is on, and was on at the time of the entry,
 * - its time is in a live period (see `livePeriods.ts`),
 * - the relay told that it accepts the uploads.
 *
 * A switch that turned off the capability removes all live periods: when it
 * is on again, only the lines that a runtime reads live from then on go up
 * automatically. Older entries go up only through a request that the owner
 * confirms
 * (`prepareOlderEntriesRequest` and `confirmOlderEntriesRequest`).
 *
 * Each tab can make a layer on the same storage. The values in the storage
 * are the source of truth: each method reads them again. Only the tab with
 * the running runtime (the holder of the Web Lock) calls the methods of the
 * reading (`startReading`, `heartbeat`, `stopReading`, `setRelayState`).
 *
 * The layer removes the share settings of the old Log Analyzer (M1).
 */
export const createLocalAccessLayer = ({
  storage,
  citizenId,
  now = () => new Date(),
}: LocalAccessLayerOptions) => {
  storage.removeItem(LEGACY_SHARE_TYPES_STORAGE_KEY);

  /** The runtime of this tab reads the log */
  let isReading = false;
  let relayState = RelayUploadState.Unknown;
  /** The runtime of this tab extends the last period with its heartbeats */
  let isOwnPeriodOpen = false;

  const getTime = () => now().getTime();

  const readRules = () => readLocalAccessRules(storage, citizenId);

  const readPeriods = (time: number) =>
    pruneLivePeriods(readLivePeriods(storage, citizenId), time);

  const isStopped = () => relayState === RelayUploadState.Stopped;

  /** False when a switch removed the own period */
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
   * Brings the stored periods in line with the reading, the switches and the
   * clock
   *
   * @param canContinue False when the end of the reading must not let a
   * next runtime continue the last period (see `stopReading`)
   */
  const updatePeriods = (canContinue = true) => {
    const time = getTime();

    // When the capability is on again, only the lines that a runtime reads live from then on go up automatically (decision 27)
    if (isStopped()) {
      isOwnPeriodOpen = false;
      writeLivePeriods(storage, citizenId, NO_LIVE_PERIODS);
      return;
    }

    const livePeriods = readPeriods(time);
    const isOpenWanted = isReading && relayState === RelayUploadState.Accepting;
    const isOwnPeriodStillOpen =
      isOwnPeriodOpen && livePeriods.canContinueLastPeriod;
    const gapLimit = isOwnPeriodStillOpen
      ? OWN_HEARTBEAT_GAP_MILLISECONDS
      : TAB_CHANGE_GAP_MILLISECONDS;

    let nextLivePeriods = livePeriods;
    if (isOpenWanted) {
      nextLivePeriods = continueOrStartPeriod(livePeriods, time, gapLimit);
    } else if (isOwnPeriodStillOpen) {
      // Only the end of the reading for a change of the active tab lets a next runtime continue the period
      nextLivePeriods = endLastPeriod(
        livePeriods,
        time,
        gapLimit,
        canContinue && relayState === RelayUploadState.Accepting,
      );
    } else if (!canContinue) {
      // A stop before the period opened (for example a period of the previous runtime): no runtime can continue it
      nextLivePeriods = { ...livePeriods, canContinueLastPeriod: false };
    }

    isOwnPeriodOpen = isOpenWanted;
    writeLivePeriods(
      storage,
      citizenId,
      pruneLivePeriods(nextLivePeriods, time),
    );
  };

  return {
    getSettings: (): LocalAccessSettings => {
      const rules = readRules();

      return {
        logEntryTypes: Object.fromEntries(
          Object.values(LogAnalyzerEntryType).map((type) => [
            type,
            rules.turnedOnAtByType.has(getOldestLogAnalyzerEntryVersion(type)),
          ]),
        ) as Record<LogAnalyzerEntryType, boolean>,
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
      const rules = readRules();

      const turnedOnAtByType = new Map(rules.turnedOnAtByType);
      for (const type of types) {
        const ruleType = getOldestLogAnalyzerEntryVersion(type);

        if (!isOn) {
          turnedOnAtByType.delete(ruleType);
        } else if (!turnedOnAtByType.has(ruleType)) {
          turnedOnAtByType.set(ruleType, time);
        }
      }

      writeLocalAccessRules(storage, citizenId, { turnedOnAtByType });
    },

    /**
     * Removes all live periods: only the lines that a runtime reads live from
     * now on go up automatically. For a different log folder, because the
     * periods are the times of the previous folder.
     */
    removeLivePeriods: () => {
      isOwnPeriodOpen = false;
      writeLivePeriods(storage, citizenId, NO_LIVE_PERIODS);
    },

    /** The summary for the `announce` message */
    getAnnouncementSummary: (): AnnounceContent["local_access_layer"] => {
      const rules = readRules();
      const onCount = RULE_TYPES.filter((type) =>
        rules.turnedOnAtByType.has(type),
      ).length;

      return {
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
     * this tab reads
     */
    heartbeat: () => {
      updatePeriods();
    },

    /**
     * The runtime of this tab stops to read.
     *
     * - `canContinue: true`: a change of the active tab. The tab loses the
     *   Web Lock or closes (`pagehide`), and a next runtime can continue the
     *   period within `TAB_CHANGE_GAP_MILLISECONDS`.
     * - `canContinue: false`: the owner stops the runtime or logs out, or the
     *   runtime lost the access to the folder. The period ends, and the next
     *   start starts a new period, also within `TAB_CHANGE_GAP_MILLISECONDS`.
     *   Thus the entries of the stopped time stay on the machine (decision
     *   27). Call it also when the runtime of this tab does not read, so that
     *   a next start does not continue the period of a previous runtime.
     */
    stopReading: ({ canContinue }: StopReadingOptions) => {
      isReading = false;
      updatePeriods(canContinue);
    },

    /**
     * What the relay told: the `welcome` of each connection, the switches, and
     * the end of the connection
     */
    setRelayState: (state: RelayUploadState) => {
      relayState = state;
      updatePeriods();
    },

    /**
     * The entries that go up automatically now. Call it for the entries of
     * each read, and again for the waiting entries before each send: a
     * switch or a type that turned off stops them.
     */
    selectAutomaticUploads: <Entry extends LocalAccessEntry>(
      entries: Iterable<Entry>,
    ): Entry[] => {
      const rules = readRules();
      if (relayState !== RelayUploadState.Accepting) return [];

      const time = getTime();
      const livePeriods = readPeriods(time);
      const isOpen = isLastPeriodOpen(livePeriods, time);

      return Array.from(entries).filter((entry) =>
        goesUpAutomatically(rules, livePeriods, isOpen, entry),
      );
    },

    /**
     * The entries that can go up now after a confirmation of the owner, or
     * that wait for their send: their types are on, and no switch turned off the
     * capability. It does not read the live periods.
     */
    selectPermittedUploads: <
      Entry extends { readonly type: LogAnalyzerEntryType },
    >(
      entries: Iterable<Entry>,
    ): Entry[] => {
      if (isStopped()) return [];

      const rules = readRules();

      return Array.from(entries).filter((entry) =>
        rules.turnedOnAtByType.has(
          getOldestLogAnalyzerEntryVersion(entry.type),
        ),
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
      const rules = readRules();
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
  };
};

export type LocalAccessLayer = ReturnType<typeof createLocalAccessLayer>;
