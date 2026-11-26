import {
  toCitizenKey,
  type BrowserRuntimeErrorCode,
  type EntryWindow,
  type OlderEntriesTimeRange,
  type OwnEntriesChange,
  type PreparedOlderEntriesRequest,
} from "@sam-monorepo/remote-control-program-runtime";
import type { LeaderState } from "./types";

/**
 * The messages between the SAM tabs of one citizen in one browser. The tab
 * that holds the Web Lock runs the runtime (the leader). It sends its state
 * and the own entries to the other tabs (the followers), and runs their
 * commands.
 */

const BROWSER_RUNTIME_CHANNEL_NAME = "remote_control_program_browser_runtime";

/**
 * The name of the Web Lock and of the BroadcastChannel of the citizen. The
 * tabs of a different citizen in the same browser elect their own runtime.
 */
export const getBrowserRuntimeChannelName = (citizenId: string) =>
  toCitizenKey(BROWSER_RUNTIME_CHANNEL_NAME, citizenId);

/**
 * A tab ignores the messages of a different version, for example of a tab
 * that was open during a deploy. Increase it for each change of the messages.
 */
export const TAB_MESSAGE_VERSION = 1;

export enum TabMessageType {
  /** Leader to all: the state of the runtime changed */
  LeaderStateChanged = "leader_state_changed",
  /** Leader to all or to one follower: the own entries changed */
  EntriesChanged = "entries_changed",
  /** Follower to leader: send the state, and optionally all entries */
  SnapshotRequested = "snapshot_requested",
  /** Follower to leader */
  CommandSent = "command_sent",
  /** Leader to the follower of the command */
  CommandAnswered = "command_answered",
  /**
   * Any tab to all: the user logs out. The runtime stops without a
   * continuation, and all tabs leave the election.
   */
  SessionEnded = "session_ended",
}

export enum TabCommandType {
  Start = "start",
  Stop = "stop",
  SetRequestedWindow = "set_requested_window",
  PrepareOlderEntriesRequest = "prepare_older_entries_request",
  ConfirmOlderEntriesRequest = "confirm_older_entries_request",
}

export type TabCommand =
  | { readonly type: TabCommandType.Start }
  | { readonly type: TabCommandType.Stop }
  | {
      readonly type: TabCommandType.SetRequestedWindow;
      readonly window: EntryWindow | null;
    }
  | {
      readonly type: TabCommandType.PrepareOlderEntriesRequest;
      readonly range: OlderEntriesTimeRange;
    }
  | {
      readonly type: TabCommandType.ConfirmOlderEntriesRequest;
      readonly requestId: string;
    };

/** The value of a successful command, by its type */
export interface TabCommandValues {
  [TabCommandType.Start]: undefined;
  [TabCommandType.Stop]: undefined;
  [TabCommandType.SetRequestedWindow]: undefined;
  [TabCommandType.PrepareOlderEntriesRequest]: PreparedOlderEntriesRequest;
  [TabCommandType.ConfirmOlderEntriesRequest]: number;
}

export type TabCommandResult =
  | { readonly isSuccess: true; readonly value: unknown }
  | { readonly isSuccess: false; readonly errorCode: BrowserRuntimeErrorCode };

export type TabMessageContent =
  | {
      readonly type: TabMessageType.LeaderStateChanged;
      readonly state: LeaderState;
    }
  | {
      readonly type: TabMessageType.EntriesChanged;
      readonly change: OwnEntriesChange;
      /** Null: all followers */
      readonly recipientTabId: string | null;
    }
  | {
      readonly type: TabMessageType.SnapshotRequested;
      readonly includesEntries: boolean;
    }
  | {
      readonly type: TabMessageType.CommandSent;
      readonly commandId: string;
      readonly command: TabCommand;
    }
  | {
      readonly type: TabMessageType.CommandAnswered;
      readonly commandId: string;
      readonly recipientTabId: string;
      readonly result: TabCommandResult;
    }
  | { readonly type: TabMessageType.SessionEnded };

export type TabMessage = TabMessageContent & {
  readonly version: typeof TAB_MESSAGE_VERSION;
  readonly senderTabId: string;
};

const TAB_MESSAGE_TYPES = new Set<unknown>(Object.values(TabMessageType));

/**
 * Only the tabs of the same origin can send to the channel, and they run
 * the code of SAM. Thus the check reads only the version and the type.
 */
export const isTabMessage = (data: unknown): data is TabMessage =>
  typeof data === "object" &&
  data !== null &&
  "version" in data &&
  data.version === TAB_MESSAGE_VERSION &&
  "type" in data &&
  TAB_MESSAGE_TYPES.has(data.type);
