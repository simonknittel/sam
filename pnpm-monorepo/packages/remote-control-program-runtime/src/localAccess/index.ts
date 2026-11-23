/**
 * The local access layer of the browser runtime: the rules of `log_entries`,
 * the "Stop all" of this browser and the rule for the upload
 */
export { LIVE_PERIOD_HEARTBEAT_INTERVAL_MILLISECONDS } from "./livePeriods.js";
export {
  createLocalAccessLayer,
  type LocalAccessEntry,
  type LocalAccessLayer,
  type LocalAccessLayerOptions,
  type LocalAccessSettings,
  type OlderEntriesRequest,
  type OlderEntriesTimeRange,
  type StopReadingOptions,
} from "./localAccessLayer.js";
export {
  LIVE_PERIODS_STORAGE_KEY,
  LOCAL_ACCESS_LAYER_STORAGE_KEY,
  type LocalAccessStorage,
} from "./localAccessStorage.js";
