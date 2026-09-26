import type { EntryType } from "./PATTERNS";

export interface RawMatch {
  readonly type: EntryType;
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

export type ResultMessage =
  | { readonly id: number; readonly matches: RawMatch[] }
  | { readonly id: number; readonly error: string };
