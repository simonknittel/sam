import { LogAnalyzerEntryType } from "@sam-monorepo/domain";
import {
  BrowserRuntime,
  BrowserRuntimeError,
  BrowserRuntimeErrorCode,
  createLocalAccessLayer,
  getLocalAccessLayerStorageKey,
  INITIAL_BROWSER_RUNTIME_STATE,
  OwnEntriesChangeMode,
  OwnEntryStore,
  type AppliedOwnEntriesChange,
  type LocalAccessLayer,
} from "@sam-monorepo/remote-control-program-runtime";
import {
  claimLegacyAutostart,
  getAutostartStorageKey,
  getRuntimeId,
  readAutostart,
  writeAutostart,
} from "./browserSettings";
import {
  claimLegacyLogFolder,
  isBrowserRuntimeSupported,
  loadLogFolder,
  pickLogFolder,
  requestLogFolderPermission,
} from "./logFolder";
import { requestConnectionToken } from "./serverRequests";
import { PendingTabCommands, toTabCommandResult } from "./tabCommands";
import {
  getBrowserRuntimeChannelName,
  isTabMessage,
  TAB_MESSAGE_VERSION,
  TabCommandType,
  TabMessageType,
  type TabCommand,
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

const ALL_TYPES_OFF = Object.fromEntries(
  Object.values(LogAnalyzerEntryType).map((type) => [type, false]),
) as Record<LogAnalyzerEntryType, boolean>;

const INITIAL_SNAPSHOT: BrowserRuntimeSnapshot = {
  ...INITIAL_BROWSER_RUNTIME_STATE,
  folder: { state: LogFolderState.Checking, name: null },
  isWaitingForFolderPermission: false,
  tabRole: BrowserRuntimeTabRole.Inactive,
  isAutostartEnabled: false,
  localAccess: { logEntryTypes: ALL_TYPES_OFF },
};

export interface BrowserRuntimeControllerOptions {
  /** The version in the `hello` of the relay protocol */
  readonly runtimeVersion: string;
  /** The user of the session. Each citizen has an own runtime. */
  readonly citizenId: string;
}

/** The runtime of this tab while it holds the Web Lock */
interface Leadership {
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
  readonly pendingCommands: PendingTabCommands;
  lockRequest: AbortController | null;
  releaseLock: (() => void) | null;
  leadership: Leadership | null;
}

/**
 * The browser runtime of a citizen in the SAM tabs of one browser (see
 * `README.md`). The tabs of the citizen elect one tab with the Web Locks
 * API. The tab that holds the lock (the leader) runs the `BrowserRuntime`.
 * The other tabs (the followers) get its state and the own entries through a
 * BroadcastChannel, and send their commands to it. When the leader closes, a
 * follower gets the lock and starts a new runtime with the state of the run
 * record (see `BrowserRuntime.shouldRun()`).
 */
export class BrowserRuntimeController {
  readonly #options: BrowserRuntimeControllerOptions;
  readonly #entryStore = new OwnEntryStore();
  readonly #listeners = new Set<() => void>();
  #snapshot = INITIAL_SNAPSHOT;
  #connection: TabConnection | null = null;
  /** After a logout, the tab does not join the election again */
  #isSessionEnded = false;
  #entrySubscriberCount = 0;
  readonly commands: BrowserRuntimeCommands;

  constructor(options: BrowserRuntimeControllerOptions) {
    this.#options = options;
    this.#entryStore.subscribe((change) => this.#broadcastEntries(change));

    const { citizenId } = options;
    this.commands = {
      start: () => this.#sendCommand({ type: TabCommandType.Start }),
      stop: () => this.#sendCommand({ type: TabCommandType.Stop }),
      setAutostartEnabled: (isEnabled) => {
        if (this.#connection === null) return;

        writeAutostart(localStorage, citizenId, isEnabled);
        this.#update({ isAutostartEnabled: isEnabled });
      },
      // A different folder starts the reading again in the tab of the runtime (see `BrowserRuntime.start()`)
      selectFolder: async () => {
        this.#requireConnection();
        if (!(await pickLogFolder(citizenId))) return false;

        await this.#sendCommand({ type: TabCommandType.Start });
        return true;
      },
      restoreFolderPermission: async () => {
        this.#requireConnection();
        if (!(await requestLogFolderPermission(citizenId))) return false;

        await this.#sendCommand({ type: TabCommandType.Start });
        return true;
      },
      setLogEntryTypes: (types, isOn) => {
        this.#changeLocalAccess((target) =>
          target.setLogEntryTypes(types, isOn),
        );
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
    if (this.#connection !== null || this.#isSessionEnded) return;

    if (!isBrowserRuntimeSupported()) {
      this.#update({
        folder: { state: LogFolderState.NotSupported, name: null },
      });
      return;
    }

    const { citizenId } = this.#options;
    const connection: TabConnection = {
      tabId: crypto.randomUUID(),
      broadcastChannel: new BroadcastChannel(
        getBrowserRuntimeChannelName(citizenId),
      ),
      layer: createLocalAccessLayer({ storage: localStorage, citizenId }),
      pendingCommands: new PendingTabCommands(),
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
      isAutostartEnabled: readAutostart(localStorage, citizenId),
      localAccess: connection.layer.getSettings(),
    });
    this.#post(connection, {
      type: TabMessageType.SnapshotRequested,
      includesEntries: this.#entrySubscriberCount > 0,
    });
    this.#joinElection(connection);
  }

  /** A different tab can start a new runtime (see `handOver()`) */
  disconnect() {
    const connection = this.#connection;
    if (connection !== null) this.#close(connection, false);
  }

  /**
   * The user logs out: the runtime of the citizen stops, the next runtime
   * obeys the autostart, and all tabs of the citizen leave the election. A
   * tab starts the runtime again only after a new page load.
   */
  endSession() {
    const connection = this.#connection;
    if (connection === null) return;

    this.#post(connection, { type: TabMessageType.SessionEnded });
    this.#close(connection, true);
  }

  #close(connection: TabConnection, endsSession: boolean) {
    if (endsSession) this.#isSessionEnded = true;

    this.#leaveElection(connection, endsSession);
    this.#connection = null;

    connection.broadcastChannel.close();
    window.removeEventListener("storage", this.#handleStorage);
    window.removeEventListener("pagehide", this.#handlePageHide);
    window.removeEventListener("pageshow", this.#handlePageShow);
    connection.pendingCommands.rejectAll();

    this.#update(INITIAL_SNAPSHOT);
  }

  #update(changes: Partial<BrowserRuntimeSnapshot>) {
    this.#snapshot = { ...this.#snapshot, ...changes };
    for (const listener of this.#listeners) listener();
  }

  #requireConnection() {
    if (this.#connection === null)
      throw new BrowserRuntimeError(BrowserRuntimeErrorCode.NotSupported);
    return this.#connection;
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
        getBrowserRuntimeChannelName(this.#options.citizenId),
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
   * The runtime writes its run record for the next tab before the tab
   * releases the lock. The next tab starts a new runtime. At a logout, the
   * runtime removes its run record.
   */
  #leaveElection(connection: TabConnection, endsSession = false) {
    connection.lockRequest?.abort();
    connection.lockRequest = null;

    const { leadership } = connection;
    if (leadership !== null) {
      connection.leadership = null;
      leadership.unsubscribe();
      if (endsSession) leadership.runtime.endSession();
      else leadership.runtime.handOver();
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

    const { citizenId } = this.#options;

    // A null key: a different tab cleared the storage
    if (
      event.key === null ||
      event.key === getLocalAccessLayerStorageKey(citizenId)
    ) {
      connection.leadership?.runtime.handleLocalAccessChange();
      this.#update({ localAccess: connection.layer.getSettings() });
    }

    if (event.key === null || event.key === getAutostartStorageKey(citizenId))
      this.#update({
        isAutostartEnabled: readAutostart(localStorage, citizenId),
      });
  };

  async #becomeLeader(connection: TabConnection) {
    const { citizenId, runtimeVersion } = this.#options;
    // The previous leader does not answer the commands of this tab any more
    connection.pendingCommands.setLeader(connection.tabId);

    const runtimeId = getRuntimeId(localStorage, citizenId);
    const runtime = new BrowserRuntime({
      citizenId,
      runtimeId,
      runtimeVersion,
      storage: localStorage,
      entryStore: this.#entryStore,
      requestConnectionToken: (signal) =>
        requestConnectionToken(runtimeId, citizenId, signal),
    });

    let previousError = runtime.getState().error;
    const leadership: Leadership = {
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

    try {
      claimLegacyAutostart(localStorage, citizenId);
      await claimLegacyLogFolder(citizenId);
    } catch (error) {
      console.error(
        "[Remote Control Program] Error taking over the settings of the old Log Analyzer:",
        error,
      );
    }
    if (connection.leadership !== leadership) return;

    const isAutostartEnabled = readAutostart(localStorage, citizenId);
    this.#update({ isAutostartEnabled });
    await this.#applyFolder(
      connection,
      leadership,
      runtime.shouldRun(isAutostartEnabled),
    );
  }

  #publishLeaderState(connection: TabConnection, leadership: Leadership) {
    const state: LeaderState = {
      ...leadership.runtime.getState(),
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
   * run record of a previous runtime)
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
      const loadedFolder = await loadLogFolder(this.#options.citizenId);
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

        connection.pendingCommands.setLeader(data.senderTabId);
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
          connection.pendingCommands.settle(data.commandId, data.result);
        return;

      case TabMessageType.SessionEnded:
        this.#close(connection, true);
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

    return connection.pendingCommands.wait(command, (commandId) =>
      this.#post(connection, {
        type: TabMessageType.CommandSent,
        commandId,
        command,
      }),
    );
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
    const result = await toTabCommandResult(() =>
      this.#runCommand(connection, command),
    );
    if (this.#connection !== connection) return;

    this.#post(connection, {
      type: TabMessageType.CommandAnswered,
      commandId,
      recipientTabId,
      result,
    });
  }

  /**
   * The tab of the runtime changes the rules through the runtime, which tells
   * the relay at once. The other tabs change the storage, and the runtime gets
   * the `storage` event.
   */
  #changeLocalAccess(
    change: (target: Pick<LocalAccessLayer, "setLogEntryTypes">) => void,
  ) {
    const connection = this.#connection;
    if (connection === null) return;

    change(connection.leadership?.runtime ?? connection.layer);
    this.#update({ localAccess: connection.layer.getSettings() });
  }
}
