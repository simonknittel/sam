import { listLogFiles } from "../logFile/listLogFiles.js";
import {
  findOldestSessionStart,
  selectLogFiles,
} from "../logFile/selectLogFiles.js";
import type { EntryWindow, LogFile, RawMatch } from "../logFile/types.js";
import { LogParserClient, type LogParser } from "./logParserClient.js";

export interface LogFolderRead {
  /**
   * The matches of the lines which were added since the last read. A match
   * can come a second time.
   */
  readonly matches: readonly RawMatch[];
  /** See `ReadResult.newestIsoDate` */
  readonly newestIsoDate: string | null;
  /** See `ReadResult.isStopped` */
  readonly isStopped: boolean;
  /** See `findOldestSessionStart()`. Of all log files of the folder. */
  readonly oldestSessionStart: number | null;
  /**
   * False when the folder has no channel folder of the game, for example
   * `LIVE` (see `listLogFiles()`). Then it has no log files.
   */
  readonly hasChannelFolder: boolean;
}

/** The log file connector for one log folder */
export interface LogFolderReader {
  /** Reads the log files which can overlap one of the windows */
  read(windows: readonly EntryWindow[]): Promise<LogFolderRead>;
  /** Stops the read on its way between two files */
  stopRead(): void;
  dispose(): void;
}

/**
 * Reads the log folder in the Web Worker of the log file connector (a test
 * gives a parser without a worker). A backup file is read one time only, and
 * `Game.log` only from the end of the last read (see `createLogFileReader`).
 */
export const createLogFolderReader = (
  folder: FileSystemDirectoryHandle,
  parser: LogParser = new LogParserClient(),
): LogFolderReader => {
  /** The files of the last read of the folder, by their path */
  let knownLogFiles: ReadonlyMap<string, LogFile> = new Map();

  return {
    read: async (windows) => {
      const { channelFolderCount, logFiles } = await listLogFiles(
        folder,
        knownLogFiles,
      );
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

      const result = await parser.parse(selectedFiles);

      return {
        ...result,
        oldestSessionStart: findOldestSessionStart(logFiles),
        hasChannelFolder: channelFolderCount > 0,
      };
    },
    stopRead: () => parser.stopReads(),
    dispose: () => parser.terminate(),
  };
};
