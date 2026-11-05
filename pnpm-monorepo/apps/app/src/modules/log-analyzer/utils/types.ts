import type { LogAnalyzerEntryType } from "@sam-monorepo/domain";

export interface RawMatch {
  readonly type: LogAnalyzerEntryType;
  readonly isoDate: string;
  readonly fullMatch: string;
  readonly groups: Record<string, string>;
}

/**
 * A log file and its path inside the selected folder. Two folders can hold
 * files of the same name, thus the path identifies the file.
 */
export interface LogFile {
  readonly path: string;
  readonly file: File;
}

export interface ParseRequest {
  readonly id: number;
  readonly files: readonly LogFile[];
  /**
   * Reads the files from their start, not only the lines which were added
   * since the last request.
   */
  readonly isFullRead: boolean;
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
  readonly readFileCount: number;
  readonly readByteCount: number;
}

export type ResultMessage =
  | ({ readonly id: number } & ReadResult)
  | { readonly id: number; readonly progress: ReadProgress }
  | { readonly id: number; readonly error: string };
