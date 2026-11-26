import type { Logger } from "@sam-monorepo/application";
import { RemoteControlProgramUnleashFlag } from "@sam-monorepo/domain";
import { InMemStorageProvider, Unleash, UnleashEvents } from "unleash-client";
import { describeError } from "./logger.js";
import { resolveWithin } from "./time.js";

/**
 * The switch of the organization: the Unleash flag
 * `DisableRemoteControlProgram` (see "Switches" of
 * `docs/remote-control-program/README.md`). The relay service gives it to
 * the use cases (the port `isRemoteControlProgramTurnedOff`), and closes all
 * connections when the program turns off.
 */
export interface ProgramSwitch {
  /** False until Unleash answers */
  readonly isTurnedOff: () => boolean;
  /**
   * Calls the listener after each change of the switch. Returns the function
   * that ends the subscription.
   */
  readonly subscribe: (listener: (isTurnedOff: boolean) => void) => () => void;
  readonly close: () => void;
}

export interface SettableProgramSwitch extends ProgramSwitch {
  /**
   * Changes the switch, and calls the listeners when it changed
   *
   * @returns false when the switch did not change
   */
  readonly set: (isTurnedOff: boolean) => boolean;
}

/**
 * The switch in memory, with the program on at the start: the relay service
 * without the configuration of Unleash, the Unleash client and the tests
 */
export const createProgramSwitch = (): SettableProgramSwitch => {
  const listeners = new Set<(isTurnedOff: boolean) => void>();
  let isTurnedOff = false;

  return {
    isTurnedOff: () => isTurnedOff,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    set: (nextIsTurnedOff) => {
      if (nextIsTurnedOff === isTurnedOff) return false;

      isTurnedOff = nextIsTurnedOff;
      for (const listener of listeners) listener(isTurnedOff);
      return true;
    },
    close: () => listeners.clear(),
  };
};

/** The maximum time of one request to Unleash */
const UNLEASH_REQUEST_TIMEOUT_MILLISECONDS = 5_000;

interface UnleashProgramSwitchOptions {
  readonly url: string;
  readonly token: string;
  /** The Playwright stack gives each worker its own app name */
  readonly appName: string;
  /** A change of the flag reaches the runtimes within this time */
  readonly refreshIntervalMilliseconds: number;
  readonly log: Logger;
}

export interface UnleashProgramSwitch extends ProgramSwitch {
  /**
   * Resolves with true after the first answer of Unleash, or with false
   * after the time limit
   */
  readonly waitUntilReady: (timeoutMilliseconds: number) => Promise<boolean>;
}

/**
 * The switch from the Unleash client of Node.js. The client polls the flags
 * and keeps them in memory, thus each read is synchronous. The flag is a kill
 * switch: until the first answer of Unleash, and when Unleash cannot be
 * reached, the client keeps the last known value (at the start: the program
 * is on), like the app.
 */
export const createUnleashProgramSwitch = ({
  url,
  token,
  appName,
  refreshIntervalMilliseconds,
  log,
}: UnleashProgramSwitchOptions): UnleashProgramSwitch => {
  const programSwitch = createProgramSwitch();
  const ready = Promise.withResolvers<void>();
  let isReady = false;

  const unleash = new Unleash({
    url,
    appName,
    customHeaders: { Authorization: token },
    refreshInterval: refreshIntervalMilliseconds,
    timeout: UNLEASH_REQUEST_TIMEOUT_MILLISECONDS,
    // The default writes a backup file. The image has no writable folder for it.
    storageProvider: new InMemStorageProvider(),
  });

  const update = () => {
    // The client emits the first "changed" before "ready", and gives only the fallback before "ready"
    if (!isReady) return;

    // The client adds the app name to the context of each flag
    const isTurnedOff = unleash.isEnabled(
      RemoteControlProgramUnleashFlag.DisableRemoteControlProgram,
    );
    if (!programSwitch.set(isTurnedOff)) return;

    log.info("The switch of the Remote Control Program changed", {
      isProgramTurnedOff: isTurnedOff,
    });
  };

  unleash.on(UnleashEvents.Ready, () => {
    isReady = true;
    update();
    ready.resolve();
  });
  unleash.on(UnleashEvents.Changed, update);
  unleash.on(UnleashEvents.Error, (error: unknown) => {
    log.warn("The Unleash client failed", { error: describeError(error) });
  });
  unleash.on(UnleashEvents.Warn, (message: unknown) => {
    log.warn("The Unleash client sent a warning", {
      warning: String(message),
    });
  });

  return {
    isTurnedOff: programSwitch.isTurnedOff,
    subscribe: programSwitch.subscribe,
    close: () => {
      programSwitch.close();
      unleash.destroy();
    },
    waitUntilReady: (timeoutMilliseconds) =>
      resolveWithin(
        ready.promise.then(() => true),
        timeoutMilliseconds,
        false,
      ),
  };
};
