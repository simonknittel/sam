import type { LogFeedEntry } from "@/modules/remote-control-program/consumer/logFeedEntry";
import { deriveEntryFields, type IEntry } from "./PATTERNS";

/**
 * The entries of each feed entry. The consumer client keeps a feed entry
 * object while it keeps the entry (see `toLocalLogFeedEntry()`), thus an
 * entry keeps its identity and the memoized rows of the table do not render
 * again.
 */
const entryCache = new WeakMap<LogFeedEntry, IEntry>();

interface Options {
  readonly ownCitizenId: string;
  /** The entries of an event at or after this time are new */
  readonly newSince: Date;
}

/** An entry of the feed `log_entries` as the Log Analyzer shows it */
export const toEntry = (
  feedEntry: LogFeedEntry,
  { ownCitizenId, newSince }: Options,
): IEntry => {
  const isShared = feedEntry.owner.id !== ownCitizenId;
  const isNew = feedEntry.eventAt >= newSince;

  const cachedEntry = entryCache.get(feedEntry);
  if (cachedEntry?.isShared === isShared && cachedEntry.isNew === isNew)
    return cachedEntry;

  const entry: IEntry = {
    key: feedEntry.key,
    type: feedEntry.type,
    isoDate: feedEntry.eventAt,
    isNew,
    ...deriveEntryFields(feedEntry.type, feedEntry.groups),
    citizen: {
      id: feedEntry.owner.id,
      handle: feedEntry.owner.handle,
      // The grants of a deleted owner give no access, thus the feed has no entry of a deleted citizen
      deletedAt: null,
    },
    isShared,
    lineNumber: feedEntry.lineNumber,
  };
  entryCache.set(feedEntry, entry);
  return entry;
};
