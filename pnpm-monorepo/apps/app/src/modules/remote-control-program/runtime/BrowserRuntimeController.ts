import { LogAnalyzerEntryType } from "@sam-monorepo/domain";
import {
  BrowserRuntime,
  BrowserRuntimeError,
  BrowserRuntimeErrorCode,
  createLocalAccessLayer,
  INITIAL_BROWSER_RUNTIME_STATE,
  LOCAL_ACCESS_LAYER_STORAGE_KEY,
  OwnEntriesChangeMode,
  OwnEntryStore,
  type AppliedOwnEntriesChange,
  type LocalAccessLayer,
} from "@sam-monorepo/remote-control-program-runtime";
import {
  AUTOSTART_STORAGE_KEY,
  getRuntimeId,
  readAutostart,
  writeAutostart,
} from "./browserSettings";
import {
  isBrowserRuntimeSupported,
  loadLogFolder,
  pickLogFolder,
  requestLogFolderPermission,
} from "./logFolder";
import { findOwnEntryKeys, requestConnectionToken } from "./serverRequests";
import {
  BROWSER_RUNTIME_CHANNEL_NAME,
  isTabMessage,
  TAB_MESSAGE_VERSION,
  TabCommandType,
  TabMessageType,
  type TabCommand,
  type TabCommandResult,
  type TabCommandValues,
  type TabMessage,
  type TabMessageContent,
} from "./tabMessages";
import {
  BrowserRuntimeTabRole,
  LogFolderState,
  type BrowserRuntimeCommands,
  type BrowserRuntimeSnapshot,
  type LeaderState,
  type LogFolderStatus,
} from "./types";

/** The time for the answer of the tab of the runtime to a command */
const COMMAND_TIMEOUT_MILLISECONDS = 15_000;

/**
 * A request for older entries reads the log files of its range first. A read
 * of the logs of one year can take some minutes.
 */
const READING_COMMAND_TIMEOUT_MILLISECONDS = 10 * 60_000;

const getCommandTimeout = (type: TabCommandType) => {
  switch (type) {
    case TabCommandType.PrepareOlderEntriesRequest:
      return READING_COMMAND_TIMEOUT_MILLISECONDS;

    case TabCommandType.Start:
    case TabCommandType.Stop:
    case TabCommandType.SetRequestedWindow:
    case TabCommandType.ConfirmOlderEntriesRequest:
      return COMMAND_TIMEOUT_MILLISECONDS;

    default:
      throw new Error(`Unknown command type: ${type satisfies never}`);
  }
};

const ALL_TYPES_OFF = Object.fromEntries(
  Object.values(LogAnalyzerEntryType).map((type) => [type, false]),
) as Record<LogAnalyzerEntryType, boolean>;

const INITIAL_SNAPSHOT: BrowserRuntimeSnapshot = {
  ...INITIAL_BROWSER_RUNTIME_STATE,
  runtimeId: null,
  folder: { state: LogFolderState.Checking, name: null },
  isWaitingForFolderPermission: false,
  tabRole: BrowserRuntimeTabRole.Inactive,
  isAutostartEnabled: false,
  localAccess: { logEntryTypes: ALL_TYPES_OFF, stoppedAt: null },
};

interface PendingCommand {
  readonly resolve: (value: unknown) => void;
  readonly reject: (error: Error) => void;
  readonly cancelTimeout: () => void;
}

/** The runtime of this tab while it holds the Web Lock */
interface Leadership {
  readonly runtimeId: string;
  readonly runtime: BrowserRuntime;
  /** The same object while the folder stays the same (see `start()`) */
  folderHandle: FileSystemDirectoryHandle | null;
  folder: LogFolderStatus;
  isWaitingForFolderPermission: boolean;
  readonly unsubscribe: () => void;
}

/** The resources of the tab between `connect()` and `disconnect()` */
interface TabConnection {
  readonly tabId: string;
  readonly broadcastChannel: BroadcastChannel;
  /** For the settings in each tab. The runtime has its own layer. */
  readonly layer: LocalAccessLayer;
  readonly pendingCommands: Map<string, PendingCommand>;
  lockRequest: AbortController | null;
  releaseLock: (() => void) | null;
  leadership: Leadership | null;
}

/**
 * The browser runtime in the SAM tabs of one browser (see `README.md`). The
 * tabs elect one tab with the Web Locks API. The tab that holds the lock (the
 * leader) runs the `BrowserRuntime`. The other tabs (the followers) get its
 * state and the own entries through a BroadcastChannel, and send their
 * commands to it. When the leader closes, a follower gets the lock and
 * continues the runtime.
 */
export class BrowserRuntimeController {
  readonly #runtimeVersion: string;
  readonly #entryStore = new OwnEntryStore();
  readonly #listeners = new Set<() => void>();
  #snapshot = INITIAL_SNAPSHOT;
  #connection: TabConnection | null = null;
  #entrySubscriberCount = 0;
  readonly commands: BrowserRuntimeCommands;

  constructor({ runtimeVersion }: { readonly runtimeVersion: string }) {
    this.#runtimeVersion = runtimeVersion;
    this.#entryStore.subscribe((change) => this.#broadcastEntries(change));

    this.commands = {
      start: () => this.#sendCommand({ type: TabCommandType.Start }),
      stop: () => this.#sendCommand({ type: TabCommandType.Stop }),
      setAutostartEnabled: (isEnabled) => {
        if (this.#connection === null) return;

        writeAutostart(localStorage, isEnabled);
        this.#update({ isAutostartEnabled: isEnabled });
      },
      selectFolder: async () => {
        this.#requireConnection();
        if (!(await pickLogFolder())) return false;

        await this.#sendCommand({ type: TabCommandType.Start });
        return true;
      },
      restoreFolderPermission: async () => {
        this.#requireConnection();
        if (!(await requestLogFolderPermission())) return false;

        await this.#sendCommand({ type: TabCommandType.Start });
        return true;
      },
      setLogEntryTypes: (types, isOn) => {
        this.#changeLocalAccess((target) =>
          target.setLogEntryTypes(types, isOn),
        );
      },
      stopAll: () => {
        this.#changeLocalAccess((target) => target.stopAll());
      },
      startAll: () => {
        this.#changeLocalAccess((target) => target.startAll());
      },
      setRequestedWindow: (window) =>
        this.#sendCommand({ type: TabCommandType.SetRequestedWindow, window }),
      prepareOlderEntriesRequest: (range) =>
        this.#sendCommand({
          type: TabCommandType.PrepareOlderEntriesRequest,
          range,
        }),
      confirmOlderEntriesRequest: (requestId) =>
        this.#sendCommand({
          type: TabCommandType.ConfirmOlderEntriesRequest,
          requestId,
        }),
    };
  }

  /** For `useSyncExternalStore` */
  subscribe = (listener: () => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };

  getSnapshot = () => this.#snapshot;

  getServerSnapshot = () => INITIAL_SNAPSHOT;

  /**
   * For `useSyncExternalStore`. A follower keeps the own entries only while a
   * component shows them.
   */
  subscribeEntries = (listener: () => void) => {
    const unsubscribe = this.#entryStore.subscribe(() => listener());
    this.#entrySubscriberCount += 1;

    const connection = this.#connection;
    if (
      this.#entrySubscriberCount === 1 &&
      connection !== null &&
      connection.leadership === null
    )
      this.#post(connection, {
        type: TabMessageType.SnapshotRequested,
        includesEntries: true,
      });

    return () => {
      unsubscribe();
      this.#entrySubscriberCount -= 1;

      if (
        this.#entrySubscriberCount === 0 &&
        (this.#connection?.leadership ?? null) === null
      )
        this.#entryStore.apply({
          mode: OwnEntriesChangeMode.Replace,
          entries: [],
        });
    };
  };

  getEntriesSnapshot = () => this.#entryStore.getSnapshot();

  connect() {
    if (this.#connection !== null) return;

    if (!isBrowserRuntimeSupported()) {
      this.#update({
        folder: { state: LogFolderState.NotSupported, name: null },
      });
      return;
    }

    const connection: TabConnection = {
      tabId: crypto.randomUUID(),
      broadcastChannel: new BroadcastChannel(BROWSER_RUNTIME_CHANNEL_NAME),
      layer: createLocalAccessLayer({ storage: localStorage }),
      pendingCommands: new Map(),
      lockRequest: null,
      releaseLock: null,
      leadership: null,
    };
    this.#connection = connection;

    connection.broadcastChannel.addEventListener(
      "message",
      (event: MessageEvent<unknown>) => {
        this.#handleMessage(connection, event.data);
      },
    );
    window.addEventListener("storage", this.#handleStorage);
    window.addEventListener("pagehide", this.#handlePageHide);
    window.addEventListener("pageshow", this.#handlePageShow);

    this.#update({
      isAutostartEnabled: readAutostart(localStorage),
      localAccess: connection.layer.getSettings(),
    });
    this.#post(connection, {
      type: TabMessageType.SnapshotRequested,
      includesEntries: this.#entrySubscriberCount > 0,
    });
    this.#joinElection(connection);
  }

  disconnect() {
    const connection = this.#connection;
    if (connection === null) return;

    this.#leaveElection(connection);
    this.#connection = null;

    connection.broadcastChannel.close();
    window.removeEventListener("storage", this.#handleStorage);
    window.removeEventListener("pagehide", this.#handlePageHide);
    window.removeEventListener("pageshow", this.#handlePageShow);

    for (const pendingCommand of connection.pendingCommands.values()) {
      pendingCommand.cancelTimeout();
      pendingCommand.reject(
        new BrowserRuntimeError(BrowserRuntimeErrorCode.NoAnswer),
      );
    }
    connection.pendingCommands.clear();

    this.#update(INITIAL_SNAPSHOT);
  }

  #update(changes: Partial<BrowserRuntimeSnapshot>) {
    this.#snapshot = { ...this.#snapshot, ...changes };
    for (const listener of this.#listeners) listener();
  }

  #requireConnection() {
    if (this.#connection === null)
      throw new BrowserRuntimeError(BrowserRuntimeErrorCode.NotSupported);
  }

  #post(connection: TabConnection, content: TabMessageContent) {
    const message: TabMessage = {
      ...content,
      version: TAB_MESSAGE_VERSION,
      senderTabId: connection.tabId,
    };

    try {
      connection.broadcastChannel.postMessage(message);
    } catch (error) {
      console.error(
        "[Remote Control Program] Error sending a message to the other tabs:",
        error,
      );
    }
  }

  #broadcastEntries(change: AppliedOwnEntriesChange) {
    const connection = this.#connection;
    if (!connection?.leadership) return;
    if (
      change.mode === OwnEntriesChangeMode.Append &&
      change.entries.length === 0
    )
      return;

    this.#post(connection, {
      type: TabMessageType.EntriesChanged,
      change: { mode: change.mode, entries: change.entries },
      recipientTabId: null,
    });
  }

  #joinElection(connection: TabConnection) {
    const lockRequest = new AbortController();
    connection.lockRequest = lockRequest;

    navigator.locks
      .request(
        BROWSER_RUNTIME_CHANNEL_NAME,
        { signal: lockRequest.signal },
        // The tab holds the lock until it resolves the promise
        () =>
          new Promise<void>((resolve) => {
            if (
              this.#connection !== connection ||
              connection.lockRequest !== lockRequest
            ) {
              resolve();
              return;
            }

            connection.releaseLock = resolve;
            void this.#becomeLeader(connection);
          }),
      )
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError")
          return;

        console.error(
          "[Remote Control Program] Error in the election of the runtime tab:",
          error,
        );
      });
  }

  /**
   * The runtime gives its live period and its run record to the next tab
   * before the tab releases the lock
   */
  #leaveElection(connection: TabConnection) {
    connection.lockRequest?.abort();
    connection.lockRequest = null;

    const { leadership } = connection;
    if (leadership !== null) {
      connection.leadership = null;
      leadership.unsubscribe();
      leadership.runtime.handOver();
      this.#update({ tabRole: BrowserRuntimeTabRole.Inactive });
    }

    connection.releaseLock?.();
    connection.releaseLock = null;
  }

  #handlePageHide = () => {
    const connection = this.#connection;
    if (connection !== null) this.#leaveElection(connection);
  };

  /** A page from the back/forward cache joins the election again */
  #handlePageShow = (event: PageTransitionEvent) => {
    const connection = this.#connection;
    if (connection !== null && event.persisted) this.#joinElection(connection);
  };

  #handleStorage = (event: StorageEvent) => {
    const connection = this.#connection;
    if (connection === null || event.storageArea !== localStorage) return;

    // A null key: a different tab cleared the storage
    if (event.key === null || event.key === LOCAL_ACCESS_LAYER_STORAGE_KEY) {
      connection.leadership?.runtime.handleLocalAccessChange();
      this.#update({ localAccess: connection.layer.getSettings() });
    }

    if (event.key === null || event.key === AUTOSTART_STORAGE_KEY)
      this.#update({ isAutostartEnabled: readAutostart(localStorage) });
  };

  async #becomeLeader(connection: TabConnection) {
    const runtimeId = getRuntimeId(localStorage);
    const runtime = new BrowserRuntime({
      runtimeId,
      runtimeVersion: this.#runtimeVersion,
      storage: localStorage,
      entryStore: this.#entryStore,
      requestConnectionToken: (signal) =>
        requestConnectionToken(runtimeId, signal),
      findOwnEntryKeys,
    });

    let previousError = runtime.getState().error;
    const leadership: Leadership = {
      runtimeId,
      runtime,
      folderHandle: null,
      folder: { state: LogFolderState.Checking, name: null },
      isWaitingForFolderPermission: false,
      unsubscribe: runtime.subscribe((state) => {
        // The browser can take the access to the folder back
        if (
          state.error === BrowserRuntimeErrorCode.ReadFailed &&
          previousError !== BrowserRuntimeErrorCode.ReadFailed
        )
          void this.#applyFolder(connection, leadership, false);

        previousError = state.error;
        this.#publishLeaderState(connection, leadership);
      }),
    };
    connection.leadership = leadership;

    this.#update({ tabRole: BrowserRuntimeTabRole.Leader });
    this.#publishLeaderState(connection, leadership);

    await this.#applyFolder(
      connection,
      leadership,
      runtime.shouldRun(readAutostart(localStorage)),
    );
  }

  #publishLeaderState(connection: TabConnection, leadership: Leadership) {
    const state: LeaderState = {
      ...leadership.runtime.getState(),
      runtimeId: leadership.runtimeId,
      folder: leadership.folder,
      isWaitingForFolderPermission: leadership.isWaitingForFolderPermission,
    };

    this.#update(state);
    this.#post(connection, {
      type: TabMessageType.LeaderStateChanged,
      state,
    });
  }

  /**
   * Loads the stored folder and its permission, and starts or stops the
   * runtime
   *
   * @param shouldStart The runtime must run (the autostart, a start, or the
   * continuation of a previous runtime)
   */
  async #applyFolder(
    connection: TabConnection,
    leadership: Leadership,
    shouldStart: boolean,
  ) {
    const { runtime } = leadership;

    let folderHandle: FileSystemDirectoryHandle | null;
    let folder: LogFolderStatus;
    try {
      const loadedFolder = await loadLogFolder();
      folderHandle = loadedFolder.handle;
      folder = loadedFolder.status;

      // The same folder keeps its handle object, thus the runtime keeps its entries
      const previousHandle = leadership.folderHandle;
      if (
        folderHandle !== null &&
        previousHandle !== null &&
        (await folderHandle.isSameEntry(previousHandle))
      )
        folderHandle = previousHandle;
    } catch (error) {
      console.error(
        "[Remote Control Program] Error loading the folder:",
        error,
      );
      return;
    }
    if (connection.leadership !== leadership) return;

    const wantsToRun =
      shouldStart ||
      runtime.getState().isRunning ||
      leadership.isWaitingForFolderPermission;

    leadership.folderHandle = folderHandle;
    leadership.folder = folder;

    if (folderHandle !== null && folder.state === LogFolderState.Granted) {
      leadership.isWaitingForFolderPermission = false;
      if (wantsToRun) runtime.start(folderHandle);
    } else {
      // Without the access, the runtime does not read live
      runtime.stop();
      // A next tab of the runtime keeps the wish to run
      runtime.setWaitingForStart(wantsToRun);
      leadership.isWaitingForFolderPermission =
        wantsToRun && folder.state === LogFolderState.PermissionNeeded;
    }

    this.#publishLeaderState(connection, leadership);
  }

  #handleMessage(connection: TabConnection, data: unknown) {
    if (!isTabMessage(data) || this.#connection !== connection) return;

    const { leadership } = connection;

    switch (data.type) {
      case TabMessageType.LeaderStateChanged:
        // A late message of the previous leader
        if (leadership !== null) return;

        this.#update({
          ...data.state,
          tabRole: BrowserRuntimeTabRole.Follower,
        });
        return;

      case TabMessageType.EntriesChanged:
        if (
          leadership !== null ||
          this.#entrySubscriberCount === 0 ||
          (data.recipientTabId !== null &&
            data.recipientTabId !== connection.tabId)
        )
          return;

        this.#entryStore.apply(data.change);
        return;

      case TabMessageType.SnapshotRequested:
        if (leadership === null) return;

        this.#publishLeaderState(connection, leadership);
        if (data.includesEntries)
          this.#post(connection, {
            type: TabMessageType.EntriesChanged,
            change: {
              mode: OwnEntriesChangeMode.Replace,
              entries: Array.from(this.#entryStore.values()),
            },
            recipientTabId: data.senderTabId,
          });
        return;

      case TabMessageType.CommandSent:
        if (leadership === null) return;

        void this.#answerCommand(
          connection,
          data.senderTabId,
          data.commandId,
          data.command,
        );
        return;

      case TabMessageType.CommandAnswered:
        if (data.recipientTabId === connection.tabId)
          this.#settleCommand(connection, data.commandId, data.result);
        return;

      default:
        throw new Error(
          `Unknown tab message: ${JSON.stringify(data satisfies never)}`,
        );
    }
  }

  #sendCommand<Command extends TabCommand>(
    command: Command,
  ): Promise<TabCommandValues[Command["type"]]> {
    const connection = this.#connection;
    if (connection === null)
      return Promise.reject(
        new BrowserRuntimeError(BrowserRuntimeErrorCode.NotSupported),
      );

    // `#runCommand()` gives the value of the type of the command
    if (connection.leadership !== null)
      return this.#runCommand(connection, command) as Promise<
        TabCommandValues[Command["type"]]
      >;

    return new Promise((resolve, reject) => {
      const commandId = crypto.randomUUID();
      const timeout = window.setTimeout(() => {
        connection.pendingCommands.delete(commandId);
        reject(new BrowserRuntimeError(BrowserRuntimeErrorCode.NoAnswer));
      }, getCommandTimeout(command.type));

      connection.pendingCommands.set(commandId, {
        resolve: resolve as (value: unknown) => void,
        reject,
        cancelTimeout: () => window.clearTimeout(timeout),
      });
      this.#post(connection, {
        type: TabMessageType.CommandSent,
        commandId,
        command,
      });
    });
  }

  async #runCommand(
    connection: TabConnection,
    command: TabCommand,
  ): Promise<unknown> {
    const { leadership } = connection;
    if (leadership === null)
      throw new BrowserRuntimeError(BrowserRuntimeErrorCode.NoAnswer);

    const { runtime } = leadership;

    switch (command.type) {
      case TabCommandType.Start:
        await this.#applyFolder(connection, leadership, true);
        if (!runtime.getState().isRunning)
          throw new BrowserRuntimeError(
            BrowserRuntimeErrorCode.FolderNotGranted,
          );
        return undefined;

      case TabCommandType.Stop:
        leadership.isWaitingForFolderPermission = false;
        runtime.stop();
        this.#publishLeaderState(connection, leadership);
        return undefined;

      case TabCommandType.SetRequestedWindow:
        runtime.setRequestedWindow(command.window);
        return undefined;

      case TabCommandType.PrepareOlderEntriesRequest:
        return runtime.prepareOlderEntriesRequest(command.range);

      case TabCommandType.ConfirmOlderEntriesRequest:
        return runtime.confirmOlderEntriesRequest(command.requestId);

      default:
        throw new Error(
          `Unknown command: ${JSON.stringify(command satisfies never)}`,
        );
    }
  }

  async #answerCommand(
    connection: TabConnection,
    recipientTabId: string,
    commandId: string,
    command: TabCommand,
  ) {
    let result: TabCommandResult;
    try {
      result = {
        isSuccess: true,
        value: await this.#runCommand(connection, command),
      };
    } catch (error) {
      if (!(error instanceof BrowserRuntimeError))
        console.error(
          "[Remote Control Program] Error in a command of a different tab:",
          error,
        );

      result = {
        isSuccess: false,
        errorCode:
          error instanceof BrowserRuntimeError
            ? error.code
            : BrowserRuntimeErrorCode.NoAnswer,
      };
    }
    if (this.#connection !== connection) return;

    this.#post(connection, {
      type: TabMessageType.CommandAnswered,
      commandId,
      recipientTabId,
      result,
    });
  }

  #settleCommand(
    connection: TabConnection,
    commandId: string,
    result: TabCommandResult,
  ) {
    const pendingCommand = connection.pendingCommands.get(commandId);
    if (pendingCommand === undefined) return;

    connection.pendingCommands.delete(commandId);
    pendingCommand.cancelTimeout();

    if (result.isSuccess) pendingCommand.resolve(result.value);
    else pendingCommand.reject(new BrowserRuntimeError(result.errorCode));
  }

  /**
   * The tab of the runtime changes the rules through the runtime: it ends
   * its live period at the exact time of a "Stop all", and tells the relay
   * at once. The other tabs change the storage, and the runtime gets the
   * `storage` event.
   */
  #changeLocalAccess(
    change: (
      target: Pick<
        LocalAccessLayer,
        "setLogEntryTypes" | "stopAll" | "startAll"
      >,
    ) => void,
  ) {
    const connection = this.#connection;
    if (connection === null) return;

    change(connection.leadership?.runtime ?? connection.layer);
    this.#update({ localAccess: connection.layer.getSettings() });
  }
}
