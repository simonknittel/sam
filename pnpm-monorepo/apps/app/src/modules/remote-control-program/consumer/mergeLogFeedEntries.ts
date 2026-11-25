import {
  isInVisibleTimeRange,
  type VisibleTimeRange,
} from "@sam-monorepo/domain";
import type {
  EntryWindow,
  RawMatch,
} from "@sam-monorepo/remote-control-program-runtime";
import {
  compareLogFeedEntries,
  toLocalLogFeedEntry,
  type LogFeedEntry,
  type LogFeedEntryOwner,
} from "./logFeedEntry";

/** The entries that a consumer shows */
export interface LogFeedScope {
  /** The time of the observation. `end` is exclusive. */
  readonly entryWindow: EntryWindow;
  /**
   * The owners. Null: the own entries and the entries of all owners who
   * share with the viewer.
   */
  readonly ownerCitizenIds: readonly string[] | null;
}

const createScopeFilter = ({ entryWindow, ownerCitizenIds }: LogFeedScope) => {
  const ownerCitizenIdSet =
    ownerCitizenIds === null ? null : new Set(ownerCitizenIds);

  return (entry: LogFeedEntry) =>
    isInVisibleTimeRange(entryWindow, entry.eventAt) &&
    (ownerCitizenIdSet === null || ownerCitizenIdSet.has(entry.owner.id));
};

/** The own entries of the browser runtime. None without an own citizen. */
export const toLocalLogFeedEntries = (
  matches: ReadonlyMap<string, RawMatch>,
  owner: LogFeedEntryOwner | null,
) =>
  owner === null
    ? []
    : Array.from(matches.values(), (match) =>
        toLocalLogFeedEntry(match, owner),
      );

interface MergeInput {
  /** The own entries of the browser runtime of this browser */
  readonly localEntries: readonly LogFeedEntry[];
  /**
   * The entries of the relay: the own entries of the other machines, and the
   * entries of the other owners
   */
  readonly relayEntries: ReadonlyMap<string, LogFeedEntry>;
  readonly scope: LogFeedScope;
}

/**
 * Combines the entries of the browser runtime and of the relay for a control
 * UI: one entry for each key, only the entries of the scope, from the oldest
 * to the newest (`compareLogFeedEntries()`). The entry of the browser
 * runtime wins over its copy of the relay: it is there without a read.
 */
export const mergeLogFeedEntries = ({
  localEntries,
  relayEntries,
  scope,
}: MergeInput): LogFeedEntry[] => {
  const isInScope = createScopeFilter(scope);
  const entriesByKey = new Map<string, LogFeedEntry>();

  for (const entry of localEntries)
    if (isInScope(entry)) entriesByKey.set(entry.key, entry);

  for (const entry of relayEntries.values())
    if (!entriesByKey.has(entry.key) && isInScope(entry))
      entriesByKey.set(entry.key, entry);

  return Array.from(entriesByKey.values()).sort(compareLogFeedEntries);
};

/**
 * The upper limit of the entries of the relay in the memory of one consumer.
 * One entry uses approximately 1 KB (the raw line of a maximum of 1,000
 * characters, the capture groups and the hash), thus the limit keeps them
 * below approximately 20 MB, in addition to the own entries of the browser
 * runtime (`MAXIMUM_OWN_ENTRIES`). The snapshot reads a maximum of 10,000
 * entries (see `MAXIMUM_PAGES_PER_READ`), thus 10,000 more entries can
 * arrive while the consumer is open: for example 10 owners with one entry
 * each 30 seconds for more than 8 hours. Above the limit, the oldest
 * entries leave first.
 */
const MAXIMUM_RELAY_ENTRIES = 20_000;

/**
 * Above the limit, the store removes the oldest entries down to this share
 * of the limit. Thus it sorts the entries only one time for many new
 * entries. The store of the own entries of the browser runtime uses the
 * same idea, but this value belongs to the limit of this store.
 */
const SHARE_KEPT_AFTER_PRUNE = 0.9;

/** The entries of the relay in the memory of one consumer, by their key */
export interface RelayEntryStore {
  readonly entries: ReadonlyMap<string, LogFeedEntry>;
  /**
   * Null: the store has all entries of the relay for its scope. Else, the
   * scope has more entries than the store keeps (`MAXIMUM_RELAY_ENTRIES`,
   * `MAXIMUM_PAGES_PER_READ`): the entries up to this time can be missing,
   * and the newer entries are complete.
   */
  readonly incompleteUntil: Date | null;
}

export const EMPTY_RELAY_ENTRY_STORE: RelayEntryStore = {
  entries: new Map(),
  incompleteUntil: null,
};

const getLaterTime = (first: Date | null, second: Date) =>
  first !== null && first > second ? first : second;

export const markRelayEntriesIncomplete = (
  store: RelayEntryStore,
  until: Date,
): RelayEntryStore => ({
  entries: store.entries,
  incompleteUntil: getLaterTime(store.incompleteUntil, until),
});

/**
 * Adds the entries that the store does not have. The copies of one entry
 * are the same (the resend of the relay, the reads after a reconnect), thus
 * the first copy stays. Above `MAXIMUM_RELAY_ENTRIES`, the oldest entries
 * leave. Gives the same store when it got no new entry.
 */
export const addRelayEntries = (
  store: RelayEntryStore,
  entries: Iterable<LogFeedEntry>,
): RelayEntryStore => {
  let nextEntries: Map<string, LogFeedEntry> | null = null;

  for (const entry of entries) {
    if ((nextEntries ?? store.entries).has(entry.key)) continue;

    nextEntries ??= new Map(store.entries);
    nextEntries.set(entry.key, entry);
  }

  if (nextEntries === null) return store;
  if (nextEntries.size <= MAXIMUM_RELAY_ENTRIES)
    return { entries: nextEntries, incompleteUntil: store.incompleteUntil };

  const sortedEntries = Array.from(nextEntries.values()).sort(
    compareLogFeedEntries,
  );
  const removedEntryCount =
    sortedEntries.length -
    Math.floor(MAXIMUM_RELAY_ENTRIES * SHARE_KEPT_AFTER_PRUNE);
  const newestRemovedEntry = sortedEntries[removedEntryCount - 1];

  return {
    entries: new Map(
      sortedEntries.slice(removedEntryCount).map((entry) => [entry.key, entry]),
    ),
    incompleteUntil: getLaterTime(
      store.incompleteUntil,
      newestRemovedEntry.eventAt,
    ),
  };
};

/** Keeps the entries that the filter accepts. The same store when all stay. */
export const retainRelayEntries = (
  store: RelayEntryStore,
  isRetained: (entry: LogFeedEntry) => boolean,
): RelayEntryStore => {
  const retainedEntries = Array.from(store.entries.values()).filter(isRetained);
  if (retainedEntries.length === store.entries.size) return store;

  return {
    entries: new Map(retainedEntries.map((entry) => [entry.key, entry])),
    incompleteUntil: store.incompleteUntil,
  };
};

/** An owner of `listSharingOwners()` */
interface SharingOwnerRange {
  readonly citizen: { readonly id: string };
  /** The viewer reads only the entries of this range (decision 8) */
  readonly visibleTimeRange: VisibleTimeRange;
}

interface RelayEntryFilterInput {
  readonly scope: LogFeedScope;
  readonly ownCitizenId: string;
  /**
   * The other owners who share with the viewer now. Null when the list is
   * not known: then the filter keeps the entries of all owners.
   */
  readonly sharingOwners: readonly SharingOwnerRange[] | null;
  /**
   * The other owners outside of `sharingOwners` whose access a read of the
   * app confirmed, when the list of the owners is not complete
   * (`hasMoreOwners` of `listSharingOwners()`). The filter keeps all their
   * entries: the read gave only the entries that the viewer can read.
   */
  readonly confirmedOwnerCitizenIds?: ReadonlySet<string>;
  /** The entries before this time need no grant (decision 31) */
  readonly historyEnd: Date;
}

/**
 * The entries of the relay that the consumer can keep. When a grant ends or
 * the owner revokes it, the live entries of the owner leave the memory
 * (principle 5), and the history stays (decision 31).
 */
export const createRelayEntryFilter = ({
  scope,
  ownCitizenId,
  sharingOwners,
  confirmedOwnerCitizenIds,
  historyEnd,
}: RelayEntryFilterInput) => {
  const isInScope = createScopeFilter(scope);
  const visibleTimeRangeByOwnerCitizenId =
    sharingOwners === null
      ? null
      : new Map(
          sharingOwners.map(({ citizen, visibleTimeRange }) => [
            citizen.id,
            visibleTimeRange,
          ]),
        );

  return (entry: LogFeedEntry) => {
    if (!isInScope(entry)) return false;
    if (
      entry.owner.id === ownCitizenId ||
      entry.eventAt < historyEnd ||
      visibleTimeRangeByOwnerCitizenId === null
    )
      return true;

    const visibleTimeRange = visibleTimeRangeByOwnerCitizenId.get(
      entry.owner.id,
    );
    if (visibleTimeRange === undefined)
      return confirmedOwnerCitizenIds?.has(entry.owner.id) ?? false;

    return isInVisibleTimeRange(visibleTimeRange, entry.eventAt);
  };
};
