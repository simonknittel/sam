import {
  type AnnounceContent,
  CapabilityId,
  getOldestLogAnalyzerEntryVersion,
  LogAnalyzerEntryType,
} from "@sam-monorepo/domain";
import {
  LEGACY_SHARE_TYPES_STORAGE_KEY,
  type LocalAccessRules,
  type LocalAccessStorage,
  readLocalAccessRules,
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

/** What the relay told the runtime of this tab about the uploads */
export enum RelayUploadState {
  /**
   * The runtime did not get the `welcome` of this run yet: the entries wait
   * in the outbox of the runtime
   */
  Unknown = "unknown",
  /** The relay accepts the uploads */
  Accepting = "accepting",
  /**
   * A switch turned off the capability (`program_turned_off`). No entry goes
   * up.
   */
  Stopped = "stopped",
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
 * NaN for a text that is not a valid time. NaN is in no range, and never
 * goes up automatically.
 */
const getEntryTime = (entry: LocalAccessEntry) => Date.parse(entry.isoDate);

const isInRange = (time: number, range: OlderEntriesTimeRange) =>
  (range.start === null || time >= range.start.getTime()) &&
  (range.end === null || time < range.end.getTime());

/**
 * The local access layer of the browser runtime (see "Local access layer" of
 * `docs/remote-control-program/README.md`): the rules of `log_entries` for
 * each log entry type, and the rule for the automatic upload (decision 27).
 *
 * All is off by default. A log entry goes up automatically only when:
 *
 * - the runtime of this tab reads live, and the time of the entry is not
 *   before the time since which it reads live (`readsLiveSince`),
 * - its type is on, and its time is not before the time when the owner
 *   turned the type on,
 * - no switch turned off the capability.
 *
 * The time since which the runtime reads live is only in memory: the start of
 * the reading sets it, and the end of a switch sets it again. Thus the
 * entries of a time without a reading or with a switch never go up
 * automatically, also not after the next start. Older entries go up only through a request that the owner
 * confirms (`prepareOlderEntriesRequest` and `confirmOlderEntriesRequest`).
 *
 * Each tab can make a layer on the same storage. The rules in the storage are
 * the source of truth: each method reads them again. Only the tab with the
 * running runtime (the holder of the Web Lock) calls the methods of the
 * reading (`startReading`, `stopReading`, `setRelayState`).
 *
 * The layer removes the share settings of the old Log Analyzer (M1).
 */
export const createLocalAccessLayer = ({
  storage,
  citizenId,
  now = () => new Date(),
}: LocalAccessLayerOptions) => {
  storage.removeItem(LEGACY_SHARE_TYPES_STORAGE_KEY);

  /**
   * In milliseconds since the epoch. Null while the runtime of this tab does
   * not read.
   */
  let readsLiveSince: number | null = null;
  let relayState = RelayUploadState.Unknown;

  const getTime = () => now().getTime();

  const readRules = () => readLocalAccessRules(storage, citizenId);

  const goesUpAutomatically = (
    rules: LocalAccessRules,
    entry: LocalAccessEntry,
  ) => {
    if (readsLiveSince === null) return false;

    const turnedOnAt = rules.turnedOnAtByType.get(
      getOldestLogAnalyzerEntryVersion(entry.type),
    );
    if (turnedOnAt === undefined) return false;

    const time = getEntryTime(entry);
    return time >= readsLiveSince && time >= turnedOnAt;
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
     * The time since which the runtime of this tab reads live. Null while it
     * does not read.
     */
    getReadsLiveSince: () =>
      readsLiveSince === null ? null : new Date(readsLiveSince),

    /**
     * The runtime of this tab starts to read the log, also with a different
     * log folder: it reads live from now on
     */
    startReading: () => {
      readsLiveSince = getTime();
    },

    /**
     * The runtime of this tab stops to read: a stop of the owner, a logout, a
     * lost access to the folder, or a change of the active tab
     */
    stopReading: () => {
      readsLiveSince = null;
    },

    /**
     * What the relay told: the `welcome` of each connection and the switch.
     * When the uploads start again after a switch, the runtime reads live
     * from this time: the entries of the time before never go up
     * automatically.
     */
    setRelayState: (state: RelayUploadState) => {
      if (
        relayState === RelayUploadState.Stopped &&
        state === RelayUploadState.Accepting &&
        readsLiveSince !== null
      )
        readsLiveSince = getTime();

      relayState = state;
    },

    /**
     * The entries that go up automatically. Call it for the entries of each
     * read, and again for the waiting entries right before each send: a
     * switch or a type that turned off stops them. Before the `welcome`, the
     * entries can go up, and wait in the outbox of the runtime.
     */
    selectAutomaticUploads: <Entry extends LocalAccessEntry>(
      entries: Iterable<Entry>,
    ): Entry[] => {
      if (relayState === RelayUploadState.Stopped) return [];

      const rules = readRules();

      return Array.from(entries).filter((entry) =>
        goesUpAutomatically(rules, entry),
      );
    },

    /**
     * The entries that can go up now after a confirmation of the owner, or
     * that wait for their send: their types are on, and no switch turned off
     * the capability. It does not read the time since which the runtime reads
     * live.
     */
    selectPermittedUploads: <
      Entry extends { readonly type: LogAnalyzerEntryType },
    >(
      entries: Iterable<Entry>,
    ): Entry[] => {
      if (relayState === RelayUploadState.Stopped) return [];

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
      const rules = readRules();

      const requestedEntries: Entry[] = [];
      const countsByType = new Map<LogAnalyzerEntryType, number>();

      for (const entry of entries) {
        const ruleType = getOldestLogAnalyzerEntryVersion(entry.type);

        if (
          !rules.turnedOnAtByType.has(ruleType) ||
          !isInRange(getEntryTime(entry), range) ||
          goesUpAutomatically(rules, entry)
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
