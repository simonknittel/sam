import {
  matchNewestLogAnalyzerEntryVersion,
  toLogAnalyzerEntryType,
  type LogAnalyzerEntryType,
} from "@sam-monorepo/domain";
import type { RawMatch } from "@sam-monorepo/remote-control-program-runtime";

/** The citizen who owns an entry. The own citizen for the entries of this browser. */
export interface LogFeedEntryOwner {
  readonly id: string;
  /** Display text. It can change and it does not identify the citizen. */
  readonly handle: string | null;
}

/**
 * One entry of the feed `log_entries` for a control UI, for example the Log
 * Analyzer. The entries of the browser runtime of this browser and the
 * entries of the relay have the same shape. `LogEntryUploadState` tells
 * whether SAM has an entry.
 */
export interface LogFeedEntry {
  /**
   * The owner and the hash of the entry (see `createLogFeedEntryKey()`). The
   * same entry from the browser runtime and from the relay has the same key.
   */
  readonly key: string;
  readonly owner: LogFeedEntryOwner;
  /**
   * The newest version of the pattern that matches the raw line, as the log
   * file connector gives it. Thus an entry that an older release uploaded
   * shows like the same line of this browser.
   */
  readonly type: LogAnalyzerEntryType;
  /** The time of the observation */
  readonly eventAt: Date;
  /**
   * The number of the first line of the entry in its log file. It orders the
   * lines of one instant. Null for an entry of the upload before the Remote
   * Control Program.
   */
  readonly lineNumber: number | null;
  /** The raw line with the IP marker. Never write it to the logs. */
  readonly rawLine: string;
  /** The capture groups of the pattern of `type` */
  readonly groups: Readonly<Record<string, string>>;
}

/**
 * An entry of the relay: of a read of the app (`FeedLogEntry` of the
 * application package) or of a realtime event
 */
export interface RelayLogEntry {
  readonly owner: LogFeedEntryOwner;
  /** A value of `LogAnalyzerEntryType`, or a type of a newer release */
  readonly type: string;
  readonly rawLine: string;
  readonly eventAt: Date;
  readonly lineNumber: number | null;
  /** The key of the entry for its owner (`createLogEntryHash()`) */
  readonly hash: string;
}

const KEY_SEPARATOR = ":";

/**
 * The hash is unique only for one owner (two citizens can have the same
 * line), thus the key also contains the owner. The ids and the hashes
 * contain no colon.
 */
export const createLogFeedEntryKey = (ownerCitizenId: string, hash: string) =>
  [ownerCitizenId, hash].join(KEY_SEPARATOR);

/**
 * Null for a type that this release does not know (a newer release of the
 * relay service, or a removed pattern), and for a raw line that no version
 * of its type matches. The second case happens only after a pattern was
 * changed on an explicit request (see `AGENTS.md`).
 */
export const toRelayLogFeedEntry = (
  entry: RelayLogEntry,
): LogFeedEntry | null => {
  const storedType = toLogAnalyzerEntryType(entry.type);
  if (!storedType) return null;

  const newestVersion = matchNewestLogAnalyzerEntryVersion(
    storedType,
    entry.rawLine,
  );
  const groups = newestVersion?.match.groups;
  if (!newestVersion || !groups) return null;

  return {
    key: createLogFeedEntryKey(entry.owner.id, entry.hash),
    owner: entry.owner,
    type: newestVersion.type,
    eventAt: entry.eventAt,
    lineNumber: entry.lineNumber,
    rawLine: entry.rawLine,
    groups,
  };
};

/**
 * The entries of each match of the browser runtime. The runtime keeps a
 * match object while it keeps the entry, thus an entry keeps its identity,
 * and a control UI can keep the values that it derives from an entry.
 */
const localEntryCache = new WeakMap<RawMatch, LogFeedEntry>();

export const toLocalLogFeedEntry = (
  match: RawMatch,
  owner: LogFeedEntryOwner,
): LogFeedEntry => {
  const cachedEntry = localEntryCache.get(match);
  if (
    cachedEntry?.owner.id === owner.id &&
    cachedEntry.owner.handle === owner.handle
  )
    return cachedEntry;

  const entry: LogFeedEntry = {
    key: createLogFeedEntryKey(owner.id, match.hash),
    owner,
    type: match.type,
    eventAt: new Date(match.isoDate),
    lineNumber: match.lineNumber,
    rawLine: match.rawLine,
    groups: match.groups,
  };
  localEntryCache.set(match, entry);
  return entry;
};

const compareKeys = (first: string, second: string) => {
  if (first === second) return 0;
  return first < second ? -1 : 1;
};

/**
 * Orders the entries from the oldest to the newest: by the time, then by
 * the line number (the lines of one instant keep their order in the log
 * file, an entry without a number comes first), then by the key. The
 * entries of the browser runtime have no id of the relay, thus the key
 * makes the order the same on each run.
 */
export const compareLogFeedEntries = (
  first: LogFeedEntry,
  second: LogFeedEntry,
) =>
  first.eventAt.getTime() - second.eventAt.getTime() ||
  (first.lineNumber ?? 0) - (second.lineNumber ?? 0) ||
  compareKeys(first.key, second.key);
