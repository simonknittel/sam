import type { LogFeedEntry } from "./logFeedEntry";

/** Whether SAM has an entry */
export enum LogEntryUploadState {
  Uploaded = "uploaded",
  /** Only the browser runtime of this browser has the entry */
  LocalOnly = "local_only",
  /**
   * The consumer did not read all entries of the relay for the time of the
   * entry
   */
  Unknown = "unknown",
}

interface RelayEntries {
  readonly entries: ReadonlyMap<string, LogFeedEntry>;
  /** See `RelayEntryStore` */
  readonly incompleteUntil: Date | null;
  /**
   * The consumer read the snapshot and all changes, the realtime delivery
   * works, and no request failed
   */
  readonly isUpToDate: boolean;
}

/**
 * The relay also gives the own entries of this browser back, some seconds
 * after it accepted them
 */
export const getLogEntryUploadState = (
  entry: LogFeedEntry,
  { entries, incompleteUntil, isUpToDate }: RelayEntries,
): LogEntryUploadState => {
  if (entries.has(entry.key)) return LogEntryUploadState.Uploaded;

  if (
    !isUpToDate ||
    (incompleteUntil !== null && entry.eventAt <= incompleteUntil)
  )
    return LogEntryUploadState.Unknown;

  return LogEntryUploadState.LocalOnly;
};
