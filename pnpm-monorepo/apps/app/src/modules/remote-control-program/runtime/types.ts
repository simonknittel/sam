import type { LogAnalyzerEntryType } from "@sam-monorepo/domain";
import type {
  BrowserRuntimeState,
  EntryWindow,
  LocalAccessSettings,
  OlderEntriesTimeRange,
  PreparedOlderEntriesRequest,
} from "@sam-monorepo/remote-control-program-runtime";

/** The contract of `useBrowserRuntime()` (see `README.md`) */

export enum BrowserRuntimeTabRole {
  /**
   * No runtime in this tab: the browser does not support it, the user cannot
   * use the Remote Control Program, or the tab did not join the election yet
   */
  Inactive = "inactive",
  /** This tab holds the Web Lock and runs the runtime of this browser */
  Leader = "leader",
  /**
   * A different tab runs the runtime. This tab shows its state and sends the
   * commands to it.
   */
  Follower = "follower",
}

export enum LogFolderState {
  /** The tab of the runtime did not tell the state yet */
  Checking = "checking",
  /** The browser has no File System Access API (only Chromium browsers have it) */
  NotSupported = "not_supported",
  NotSelected = "not_selected",
  /**
   * The browser needs a click to give the access again, for example after a
   * restart of the browser (`restoreFolderPermission()`)
   */
  PermissionNeeded = "permission_needed",
  Granted = "granted",
}

export interface LogFolderStatus {
  readonly state: LogFolderState;
  /** The name of the selected folder. Null without a folder. */
  readonly name: string | null;
}

/** The state that the tab of the runtime sends to the other tabs */
export interface LeaderState extends BrowserRuntimeState {
  readonly folder: LogFolderStatus;
  /**
   * The runtime must run (the autostart, a start, or the run record of the
   * previous runtime after a change of the active tab), but the browser needs
   * a click to give the access to the folder again. The sharing popover shows
   * a note.
   */
  readonly isWaitingForFolderPermission: boolean;
}

export interface BrowserRuntimeSnapshot extends LeaderState {
  readonly tabRole: BrowserRuntimeTabRole;
  /** The runtime starts at the start of a SAM page */
  readonly isAutostartEnabled: boolean;
  /** The settings of the local access layer of this browser */
  readonly localAccess: LocalAccessSettings;
}

/**
 * The commands of the browser runtime. Each tab can use them: a tab without
 * the runtime sends them to the tab with the runtime. A command that fails
 * rejects with `BrowserRuntimeError`.
 */
export interface BrowserRuntimeCommands {
  /** Starts the reading of the selected folder. The access must be granted. */
  readonly start: () => Promise<void>;
  /** The runtime stays stopped also after a change of the active tab */
  readonly stop: () => Promise<void>;
  readonly setAutostartEnabled: (isEnabled: boolean) => void;
  /**
   * Needs a user gesture. Opens the folder picker, keeps the folder, and
   * starts the runtime with it. False when the user closed the picker.
   */
  readonly selectFolder: () => Promise<boolean>;
  /**
   * Needs a user gesture. Asks the browser for the access to the selected
   * folder again, and starts the runtime. False when the user did not give
   * the access.
   */
  readonly restoreFolderPermission: () => Promise<boolean>;
  /** The rules of the local access layer: the types that leave the machine */
  readonly setLogEntryTypes: (
    types: readonly LogAnalyzerEntryType[],
    isOn: boolean,
  ) => void;
  /**
   * The window of the entries that a control UI shows. The runtime reads
   * also the log files of this window, in addition to the log files from the
   * start of the reading. Null: only the log files from the start of the
   * reading.
   */
  readonly setRequestedWindow: (window: EntryWindow | null) => Promise<void>;
  /**
   * Reads the log files of the range, and counts the entries that would go
   * up: their types are on, they do not go up automatically, and the relay
   * does not have them. Show the counts to the owner for a confirmation.
   */
  readonly prepareOlderEntriesRequest: (
    range: OlderEntriesTimeRange,
  ) => Promise<PreparedOlderEntriesRequest>;
  /** Sends the prepared entries. Returns their number. */
  readonly confirmOlderEntriesRequest: (requestId: string) => Promise<number>;
}

export interface BrowserRuntimeHandle {
  readonly state: BrowserRuntimeSnapshot;
  readonly commands: BrowserRuntimeCommands;
}
