import type { RawMatch } from "../logFile/types.js";

/**
 * The upper limit of the own entries in the memory of one tab. The entries of
 * 14 days of play are usually far below it. One entry uses approximately 1 KB
 * (the raw line, the capture groups and the hash), thus the limit keeps the
 * entries below approximately 50 MB in each tab that holds them: the tab of
 * the runtime and each tab that shows them.
 */
export const MAXIMUM_OWN_ENTRIES = 50_000;

/**
 * Above the limit, the store removes the oldest entries down to this share of
 * the limit. Thus it sorts the entries only one time for many new entries.
 */
const SHARE_KEPT_AFTER_PRUNE = 0.9;

export enum OwnEntriesChangeMode {
  /** The entries replace all entries, for example after a change of the folder */
  Replace = "replace",
  /** The entries come in addition to the entries of the store */
  Append = "append",
}

export interface OwnEntriesChange {
  readonly mode: OwnEntriesChangeMode;
  readonly entries: readonly RawMatch[];
}

export interface AppliedOwnEntriesChange extends OwnEntriesChange {
  /**
   * The entries that the change added. `Replace`: all entries of the store.
   * `Append`: only the entries that the store did not have.
   */
  readonly entries: readonly RawMatch[];
  /** The keys of the entries that left the store */
  readonly removedKeys: readonly string[];
}

export type OwnEntriesListener = (change: AppliedOwnEntriesChange) => void;

const compareByAge = (first: RawMatch, second: RawMatch) => {
  // The game writes all timestamps in one format, thus the text order is the time order
  if (first.isoDate !== second.isoDate)
    return first.isoDate < second.isoDate ? -1 : 1;
  return first.lineNumber - second.lineNumber;
};

/**
 * The own log entries of this browser, by their key (`RawMatch.hash`). The
 * runtime keeps the entries that it read in it, and each tab that shows them
 * keeps a copy. `getSnapshot()` gives a value that does not change, for
 * `useSyncExternalStore`.
 */
export class OwnEntryStore {
  readonly #maximumEntryCount: number;
  #entries = new Map<string, RawMatch>();
  #snapshot: ReadonlyMap<string, RawMatch> = new Map();
  #isSnapshotCurrent = true;
  readonly #listeners = new Set<OwnEntriesListener>();

  constructor(maximumEntryCount = MAXIMUM_OWN_ENTRIES) {
    this.#maximumEntryCount = maximumEntryCount;
  }

  get size() {
    return this.#entries.size;
  }

  get(key: string) {
    return this.#entries.get(key);
  }

  values() {
    return this.#entries.values();
  }

  getSnapshot(): ReadonlyMap<string, RawMatch> {
    if (!this.#isSnapshotCurrent) {
      this.#snapshot = new Map(this.#entries);
      this.#isSnapshotCurrent = true;
    }
    return this.#snapshot;
  }

  /** Returns the function that ends the subscription */
  subscribe(listener: OwnEntriesListener) {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  apply(change: OwnEntriesChange): AppliedOwnEntriesChange {
    let addedEntries: RawMatch[];
    const removedKeys: string[] = [];

    switch (change.mode) {
      case OwnEntriesChangeMode.Replace:
        removedKeys.push(...this.#entries.keys());
        this.#entries = new Map(
          change.entries.map((entry) => [entry.hash, entry]),
        );
        addedEntries = Array.from(this.#entries.values());
        break;

      case OwnEntriesChangeMode.Append:
        addedEntries = [];
        for (const entry of change.entries) {
          if (this.#entries.has(entry.hash)) continue;

          this.#entries.set(entry.hash, entry);
          addedEntries.push(entry);
        }
        break;

      default:
        throw new Error(`Unknown change mode: ${change.mode satisfies never}`);
    }

    const prunedKeys = this.#prune();
    if (prunedKeys.length > 0) {
      removedKeys.push(...prunedKeys);
      addedEntries = addedEntries.filter((entry) =>
        this.#entries.has(entry.hash),
      );
    }

    const appliedChange: AppliedOwnEntriesChange = {
      mode: change.mode,
      entries: addedEntries,
      removedKeys,
    };

    if (
      change.mode === OwnEntriesChangeMode.Replace ||
      addedEntries.length > 0 ||
      removedKeys.length > 0
    ) {
      this.#isSnapshotCurrent = false;
      for (const listener of this.#listeners) listener(appliedChange);
    }

    return appliedChange;
  }

  /** Removes the oldest entries above the limit, and returns their keys */
  #prune() {
    if (this.#entries.size <= this.#maximumEntryCount) return [];

    const keptCount = Math.floor(
      this.#maximumEntryCount * SHARE_KEPT_AFTER_PRUNE,
    );
    const prunedEntries = Array.from(this.#entries.values())
      .sort(compareByAge)
      .slice(0, this.#entries.size - keptCount);

    for (const entry of prunedEntries) this.#entries.delete(entry.hash);
    return prunedEntries.map((entry) => entry.hash);
  }
}
