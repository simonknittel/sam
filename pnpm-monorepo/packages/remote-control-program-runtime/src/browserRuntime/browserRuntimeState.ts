import type { LogAnalyzerEntryType } from "@sam-monorepo/domain";
import {
  INITIAL_CHANNEL_STATE,
  type ChannelState,
} from "../channel/channelTypes.js";
import type { OlderEntriesTimeRange } from "../localAccess/localAccessLayer.js";

/**
 * The problems of the browser runtime: in `BrowserRuntimeState.error`, and
 * in `BrowserRuntimeError` of a command
 */
export enum BrowserRuntimeErrorCode {
  /** The last read of the log folder failed (state) */
  ReadFailed = "read_failed",
  /** The browser has no File System Access API (command) */
  NotSupported = "not_supported",
  /** No tab with the runtime answered the command in time (command) */
  NoAnswer = "no_answer",
  /**
   * No folder is selected, or the browser needs a click to give the access
   * again (command)
   */
  FolderNotGranted = "folder_not_granted",
  /** The runtime does not read the log (command) */
  NotRunning = "not_running",
  /**
   * The channel ended: the app has no relay service, or refused the token
   * (see `ChannelState.closeReason`) (command)
   */
  RelayNotAvailable = "relay_not_available",
  /** The app did not tell which entries the relay already has (command) */
  RelayCheckFailed = "relay_check_failed",
  /**
   * A newer request for older entries replaced the request, or a different
   * tab took the runtime (command)
   */
  RequestExpired = "request_expired",
  /**
   * The entries of the range are above the limit of the memory, thus a count
   * would miss the oldest ones (command)
   */
  TooManyEntries = "too_many_entries",
}

export class BrowserRuntimeError extends Error {
  readonly code: BrowserRuntimeErrorCode;

  constructor(code: BrowserRuntimeErrorCode, options?: ErrorOptions) {
    super(`Browser runtime: ${code}`, options);
    this.name = "BrowserRuntimeError";
    this.code = code;
  }
}

export interface BrowserRuntimeState {
  /** The runtime reads the log folder */
  readonly isRunning: boolean;
  /**
   * The connection to the relay. The status `Ended` with a `closeReason`
   * tells why this browser uploads nothing, for example
   * `ChannelEndReason.NoRelay`: the runtime works only on this machine.
   */
  readonly channel: ChannelState;
  /**
   * The newest line of the log files (see `ReadResult.newestIsoDate`). For
   * the Live-Status of the own session.
   */
  readonly newestLogLineAt: Date | null;
  /** See `LogFolderRead.oldestSessionStart`. Null before the first read. */
  readonly oldestSessionStart: number | null;
  /**
   * A read of the log folder takes longer than `SLOW_READ_MILLISECONDS`, for
   * example the first read. The short reads of the new lines do not change it.
   */
  readonly isReading: boolean;
  readonly error: BrowserRuntimeErrorCode | null;
}

export const INITIAL_BROWSER_RUNTIME_STATE: BrowserRuntimeState = {
  isRunning: false,
  channel: INITIAL_CHANNEL_STATE,
  newestLogLineAt: null,
  oldestSessionStart: null,
  isReading: false,
  error: null,
};

export type BrowserRuntimeStateListener = (state: BrowserRuntimeState) => void;

/** A request for older entries, which the owner confirms */
export interface PreparedOlderEntriesRequest {
  readonly id: string;
  readonly range: OlderEntriesTimeRange;
  /** The number of entries for each type, by the oldest version of the type */
  readonly countsByType: ReadonlyMap<LogAnalyzerEntryType, number>;
  readonly entryCount: number;
}
