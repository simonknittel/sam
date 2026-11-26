import {
  BrowserRuntimeError,
  BrowserRuntimeErrorCode,
} from "@sam-monorepo/remote-control-program-runtime";
import {
  TabCommandType,
  type TabCommand,
  type TabCommandResult,
  type TabCommandValues,
} from "./tabMessages";

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

interface PendingCommand {
  readonly resolve: (value: unknown) => void;
  readonly reject: (error: Error) => void;
  readonly cancelTimeout: () => void;
}

/**
 * The commands that a follower sent to the leader, until their answers. A
 * command fails with `NoAnswer` after its timeout, or when a different tab
 * becomes the leader: the previous leader does not answer any more.
 */
export class PendingTabCommands {
  readonly #commands = new Map<string, PendingCommand>();
  /** The tab that told the last state of the leader */
  #leaderTabId: string | null = null;

  /** Sends the command with `send` and waits for the answer */
  wait<Command extends TabCommand>(
    command: Command,
    send: (commandId: string) => void,
  ): Promise<TabCommandValues[Command["type"]]> {
    return new Promise((resolve, reject) => {
      const commandId = crypto.randomUUID();
      const timeout = window.setTimeout(() => {
        this.#commands.delete(commandId);
        reject(new BrowserRuntimeError(BrowserRuntimeErrorCode.NoAnswer));
      }, getCommandTimeout(command.type));

      this.#commands.set(commandId, {
        // The leader answers with the value of the type of the command
        resolve: resolve as (value: unknown) => void,
        reject,
        cancelTimeout: () => window.clearTimeout(timeout),
      });
      send(commandId);
    });
  }

  settle(commandId: string, result: TabCommandResult) {
    const command = this.#commands.get(commandId);
    if (command === undefined) return;

    this.#commands.delete(commandId);
    command.cancelTimeout();

    if (result.isSuccess) command.resolve(result.value);
    else command.reject(new BrowserRuntimeError(result.errorCode));
  }

  /** A tab tells the state of the leader, or this tab becomes the leader */
  setLeader(leaderTabId: string) {
    if (this.#leaderTabId !== null && this.#leaderTabId !== leaderTabId)
      this.rejectAll();
    this.#leaderTabId = leaderTabId;
  }

  rejectAll() {
    for (const command of this.#commands.values()) {
      command.cancelTimeout();
      command.reject(new BrowserRuntimeError(BrowserRuntimeErrorCode.NoAnswer));
    }
    this.#commands.clear();
  }
}

/** The answer of the leader to a command of a different tab */
export const toTabCommandResult = async (
  run: () => Promise<unknown>,
): Promise<TabCommandResult> => {
  try {
    return { isSuccess: true, value: await run() };
  } catch (error) {
    if (!(error instanceof BrowserRuntimeError))
      console.error(
        "[Remote Control Program] Error in a command of a different tab:",
        error,
      );

    return {
      isSuccess: false,
      errorCode:
        error instanceof BrowserRuntimeError
          ? error.code
          : BrowserRuntimeErrorCode.NoAnswer,
    };
  }
};
