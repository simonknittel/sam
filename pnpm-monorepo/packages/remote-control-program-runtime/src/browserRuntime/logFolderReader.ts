import { getLogFilesRecursively } from "../logFile/getLogFilesRecursively.js";
import {
  selectLogFiles,
  summarizeLogSelection,
  type LogSelection,
} from "../logFile/selectLogFiles.js";
import type {
  EntryWindow,
  LogFile,
  RawMatch,
  ReadProgress,
} from "../logFile/types.js";
import { LogParserClient } from "./logParserClient.js";

export interface LogFolderRead {
  /**
   * The matches of the lines which were added since the last read. A match
   * can come a second time.
   */
  readonly matches: readonly RawMatch[];
  /** See `ReadResult.newestIsoDate` */
  readonly newestIsoDate: string | null;
  readonly selection: LogSelection;
}

/** The log file connector for one log folder */
export interface LogFolderReader {
  /** Reads the log files which can overlap one of the windows */
  read(
    windows: readonly EntryWindow[],
    onProgress: (progress: ReadProgress) => void,
  ): Promise<LogFolderRead>;
  /** Stops the read on its way between two files */
  stopRead(): void;
  dispose(): void;
}

/**
 * Reads the log folder in the Web Worker of the log file connector. A backup
 * file is read one time only, and `Game.log` only from the end of the last
 * read (see `createLogFileReader`).
 */
export const createLogFolderReader = (
  folder: FileSystemDirectoryHandle,
): LogFolderReader => {
  const parser = new LogParserClient();
  /** The files of the last walk through the folder, by their path */
  let knownLogFiles: ReadonlyMap<string, LogFile> = new Map();

  return {
    read: async (windows, onProgress) => {
      // `Array.fromAsync()` is not in the ES2024 library of this package
      const logFiles: LogFile[] = [];
      for await (const logFile of getLogFilesRecursively(folder, knownLogFiles))
        logFiles.push(logFile);
      knownLogFiles = new Map(
        logFiles.map((logFile) => [logFile.path, logFile]),
      );

      const selections = await Promise.all(
        windows.map((window) => selectLogFiles(logFiles, window)),
      );
      const selectedPaths = new Set(
        selections.flat().map((logFile) => logFile.path),
      );
      const selectedFiles = logFiles.filter((logFile) =>
        selectedPaths.has(logFile.path),
      );

      const { matches, newestIsoDate } = await parser.parse(
        selectedFiles,
        onProgress,
      );

      return {
        matches,
        newestIsoDate,
        selection: summarizeLogSelection(logFiles, selectedFiles),
      };
    },
    stopRead: () => parser.stopReads(),
    dispose: () => parser.terminate(),
  };
};
