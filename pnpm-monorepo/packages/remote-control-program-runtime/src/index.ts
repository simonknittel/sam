/**
 * The core of the browser runtime of the Remote Control Program: the log file
 * connector, the local access layer, the channel client, and their
 * orchestration (`BrowserRuntime`) for the tab that holds the Web Lock. The
 * app gives the Web Lock, the BroadcastChannel, the folder handle and the
 * token source. The package exports only what the app uses.
 */
export { BrowserRuntime } from "./browserRuntime/browserRuntime.js";
export {
  BrowserRuntimeError,
  BrowserRuntimeErrorCode,
  INITIAL_BROWSER_RUNTIME_STATE,
  type BrowserRuntimeState,
  type PreparedOlderEntriesRequest,
} from "./browserRuntime/browserRuntimeState.js";
export {
  OwnEntriesChangeMode,
  OwnEntryStore,
  type AppliedOwnEntriesChange,
  type OwnEntriesChange,
} from "./browserRuntime/ownEntryStore.js";
export type {
  OwnEntryKeysPage,
  OwnEntryKeysQuery,
} from "./browserRuntime/relayKeys.js";
export { CHANNEL_CLIENT_LIMITS } from "./channel/channelLimits.js";
export {
  ChannelEndReason,
  ChannelStatus,
  ConnectionTokenRefusedError,
  type ChannelCloseReason,
  type ChannelState,
  type ConnectionTokenGrant,
} from "./channel/channelTypes.js";
export {
  createLocalAccessLayer,
  type LocalAccessLayer,
  type LocalAccessSettings,
  type OlderEntriesTimeRange,
} from "./localAccess/localAccessLayer.js";
export {
  getLocalAccessLayerStorageKey,
  toCitizenKey,
} from "./localAccess/localAccessStorage.js";
/** For the tests of the app, which use the same sample lines */
export { SAMPLE_LINES } from "./logFile/sampleLines.js";
export type { EntryWindow, RawMatch } from "./logFile/types.js";
