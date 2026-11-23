/**
 * The log file connector of the browser runtime: it reads `Game.log` and the
 * backups in `logbackups/`, and supplies the capability `log_entries`.
 */
export { createLogParserWorker } from "./createLogParserWorker.js";
export { getLogFilesRecursively } from "./getLogFilesRecursively.js";
export { createLogFileReader } from "./logFileReader.js";
/** For the tests of the app, which use the same sample lines */
export { SAMPLE_CRASH_FILE_END, SAMPLE_LINES } from "./sampleLines.js";
export {
  selectLogFiles,
  summarizeLogSelection,
  type LogSelection,
} from "./selectLogFiles.js";
export type {
  EntryWindow,
  LogFile,
  ParseRequest,
  RawMatch,
  ReadProgress,
  ReadResult,
  ResultMessage,
  StopRequest,
} from "./types.js";
