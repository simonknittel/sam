import type { LogAnalyzerEntryType } from "@sam-monorepo/domain";

export interface RawMatch {
  readonly type: LogAnalyzerEntryType;
  readonly isoDate: string;
  /**
   * The text of the match with the IP marker (`replaceIpAddresses` of the
   * domain package). No IP address leaves the connector, also not to the
   * local view. Thus the local entries and the uploaded entries have the same
   * lines (decision 22 of the concept).
   */
  readonly rawLine: string;
  /**
   * The key of the entry (`createLogEntryHash` of the domain package). The
   * upload, the local view and the removal of duplicates use it.
   */
  readonly hash: string;
  /** The capture groups of `rawLine` */
  readonly groups: Record<string, string>;
  /**
   * The number of the first line of the match in its log file. The first
   * line has the number 1. It orders the lines of one instant.
   */
  readonly lineNumber: number;
}

/**
 * The time span of the entries. `end` is exclusive. A missing bound means no
 * limit.
 */
export interface EntryWindow {
  readonly start: Date | null;
  readonly end: Date | null;
}

/**
 * Two folders can hold files of the same name, thus the path identifies the
 * file.
 */
export interface LogFile {
  readonly path: string;
  readonly file: File;
}

/** Reads the lines of the files which were added since the last request */
export interface ParseRequest {
  readonly id: number;
  readonly files: readonly LogFile[];
}

/** Stops each request with a lower id between two files. */
export interface StopRequest {
  readonly stopBeforeId: number;
}

/** The files of a read which had to come from the disk. */
export interface ReadProgress {
  readonly fileCount: number;
  readonly readFileCount: number;
  readonly byteCount: number;
  readonly readByteCount: number;
}

/** A stopped read holds the matches of the files which it completed. */
export interface ReadResult {
  readonly matches: RawMatch[];
  /**
   * The time of the newest timestamped line of all files which the reader
   * read so far. It moves forward while the game runs and writes its log.
   */
  readonly newestIsoDate: string | null;
}

export type ResultMessage =
  | ({ readonly id: number } & ReadResult)
  | { readonly id: number; readonly progress: ReadProgress }
  | { readonly id: number; readonly error: string };
