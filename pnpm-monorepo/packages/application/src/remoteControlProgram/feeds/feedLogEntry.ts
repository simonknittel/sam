import type { Prisma } from "@sam-monorepo/database/client";
import type { CitizenReference } from "../../citizenReference.js";

/**
 * One entry of the feed `log_entries`, in the same shape for the reads of
 * the app and for the delivery of the relay service. Thus the consumer
 * client handles the entries of both sources in the same way. Of the columns
 * of the context, only the game channel and the game version go to the
 * consumers, for the Log Analyzer.
 */
export interface FeedLogEntry {
  readonly id: string;
  /** The citizen who uploaded the entry */
  readonly owner: CitizenReference;
  /**
   * A value of `LogAnalyzerEntryType`. The database keeps the type as text:
   * a value can lack a pattern after a pattern was removed. See
   * `toLogAnalyzerEntryType`.
   */
  readonly type: string;
  /** The raw line with the IP marker. Never write it to the logs. */
  readonly rawLine: string;
  /** The time of the observation */
  readonly eventAt: Date;
  /** Null for an entry of the upload before the Remote Control Program */
  readonly lineNumber: number | null;
  /**
   * The key of the entry (`createLogEntryHash`). The consumers remove the
   * duplicates with it. Never write it to the logs.
   */
  readonly hash: string;
  /** The time of the arrival at the relay */
  readonly createdAt: Date;
  /**
   * The game channel from the header of the log file of the entry, for
   * example `LIVE` or `PTU`. Null when the header has no valid value, and
   * for an entry of the capability version 1.
   */
  readonly gameChannel: string | null;
  /**
   * The game version from the header of the log file of the entry, for
   * example `4.10.201.48085`. Null like `gameChannel`.
   */
  readonly gameVersion: string | null;
}

export const FEED_LOG_ENTRY_SELECT = {
  id: true,
  type: true,
  rawLine: true,
  eventAt: true,
  lineNumber: true,
  hash: true,
  createdAt: true,
  gameChannel: true,
  gameVersion: true,
} as const satisfies Prisma.LogAnalyzerEntrySelect;

type FeedLogEntryRow = Prisma.LogAnalyzerEntryGetPayload<{
  select: typeof FEED_LOG_ENTRY_SELECT;
}>;

export const toFeedLogEntry = (
  row: FeedLogEntryRow,
  owner: CitizenReference,
): FeedLogEntry => ({
  id: row.id,
  owner,
  type: row.type,
  rawLine: row.rawLine,
  eventAt: row.eventAt,
  lineNumber: row.lineNumber,
  hash: row.hash,
  createdAt: row.createdAt,
  gameChannel: row.gameChannel,
  gameVersion: row.gameVersion,
});
