import {
  createLogAnalyzerEntryHash,
  getOldestLogAnalyzerEntryVersion,
  type LogAnalyzerEntryType,
} from "../logAnalyzer/logAnalyzerEntries.js";
import { replaceIpAddresses } from "./ipAddressMarker.js";

/**
 * The key of an entry of the feed `log_entries`: SHA-256 (hexadecimal, in
 * lowercase, the format of `LOG_ANALYZER_ENTRY_HASH_PATTERN`) of the UTF-8
 * text of the oldest type of the pattern chain (`supersedes`), a line feed
 * and the raw line with the IP marker (see `ipAddressMarker.ts`).
 *
 * With the oldest type, two runtimes with different versions of a pattern
 * give the same hash for the same line. The formula is immutable data, like
 * the IP rule. The shared test data in
 * `remote-control-program-fixtures/log-entry-hash/` contains examples.
 */
export const createLogEntryHash = (
  type: LogAnalyzerEntryType,
  lineWithMarker: string,
) =>
  createLogAnalyzerEntryHash(
    getOldestLogAnalyzerEntryVersion(type),
    lineWithMarker,
  );

/** A raw line of the log, ready for the upload */
export interface PreparedLogEntryLine {
  /** The raw line with the IP marker */
  readonly rawLine: string;
  readonly hash: string;
}

/**
 * Replaces the IP addresses of a raw line from the log, then calculates the
 * hash of the result.
 */
export const prepareLogEntryLine = async (
  type: LogAnalyzerEntryType,
  rawLine: string,
): Promise<PreparedLogEntryLine> => {
  const lineWithMarker = replaceIpAddresses(rawLine);

  return {
    rawLine: lineWithMarker,
    hash: await createLogEntryHash(type, lineWithMarker),
  };
};
