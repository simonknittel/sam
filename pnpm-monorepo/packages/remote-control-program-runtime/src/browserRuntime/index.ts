/**
 * The browser runtime without the browser glue: the orchestration of the log
 * file connector, the local access layer and the channel client for the tab
 * that holds the Web Lock, and the store of the own entries. The app gives
 * the Web Lock, the BroadcastChannel, the folder handle and the token source.
 */
export {
  BrowserRuntime,
  BrowserRuntimeError,
  BrowserRuntimeErrorCode,
  INITIAL_BROWSER_RUNTIME_STATE,
  LOG_FOLDER_READ_INTERVAL_MILLISECONDS,
  RelayAvailability,
  type BrowserRuntimeOptions,
  type BrowserRuntimeState,
  type BrowserRuntimeStateListener,
  type ConnectionTokenGrant,
  type OwnEntryKeysPage,
  type OwnEntryKeysQuery,
  type PreparedOlderEntriesRequest,
  type UploadCounts,
} from "./browserRuntime.js";
export type { LogFolderRead, LogFolderReader } from "./logFolderReader.js";
export {
  MAXIMUM_OWN_ENTRIES,
  OwnEntriesChangeMode,
  OwnEntryStore,
  type AppliedOwnEntriesChange,
  type OwnEntriesChange,
  type OwnEntriesListener,
} from "./ownEntryStore.js";
