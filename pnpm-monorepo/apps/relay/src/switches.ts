import type { Logger } from "@sam-monorepo/application";
import {
  ALL_REMOTE_CONTROL_PROGRAM_PARTS_ON,
  getRemoteControlProgramSwitches,
  type RemoteControlProgramSwitches,
} from "@sam-monorepo/domain";
import { InMemStorageProvider, Unleash, UnleashEvents } from "unleash-client";
import { describeError } from "./logger.js";
import { resolveWithin } from "./time.js";

/**
 * The switches of the organization (the Unleash flags of
 * `RemoteControlProgramUnleashFlag`, see "Switches" of
 * `docs/remote-control-program/README.md`). The relay service gives them to
 * the use cases (the port `remoteControlProgramSwitches`), sends them to the
 * runtimes, and closes all connections when the full program turns off.
 */
export interface SwitchesSource {
  /** The current switches. All parts are on until Unleash answers. */
  readonly getSwitches: () => RemoteControlProgramSwitches;
  /**
   * Calls the listener after each change of the switches. Returns the
   * function that ends the subscription.
   */
  readonly subscribe: (
    listener: (switches: RemoteControlProgramSwitches) => void,
  ) => () => void;
  readonly close: () => void;
}

export interface SettableSwitchesSource extends SwitchesSource {
  /**
   * Replaces the switches, and calls the listeners when they changed
   *
   * @returns false when the switches did not change
   */
  readonly set: (switches: RemoteControlProgramSwitches) => boolean;
}

const areSwitchesEqual = (
  first: RemoteControlProgramSwitches,
  second: RemoteControlProgramSwitches,
) =>
  first.isProgramTurnedOff === second.isProgramTurnedOff &&
  first.turnedOffConnectorIds.join() === second.turnedOffConnectorIds.join() &&
  first.turnedOffCapabilityIds.join() === second.turnedOffCapabilityIds.join();

/**
 * The switches in memory, with all parts on at the start: the relay service
 * without the configuration of Unleash, the Unleash client and the tests
 */
export const createSwitchesSource = (): SettableSwitchesSource => {
  const listeners = new Set<(switches: RemoteControlProgramSwitches) => void>();
  let switches = ALL_REMOTE_CONTROL_PROGRAM_PARTS_ON;

  return {
    getSwitches: () => switches,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    set: (nextSwitches) => {
      if (areSwitchesEqual(switches, nextSwitches)) return false;

      switches = nextSwitches;
      for (const listener of listeners) listener(switches);
      return true;
    },
    close: () => listeners.clear(),
  };
};

/** The maximum time of one request to Unleash */
const UNLEASH_REQUEST_TIMEOUT_MILLISECONDS = 5_000;

interface UnleashSwitchesSourceOptions {
  readonly url: string;
  readonly token: string;
  /** The Playwright stack gives each worker its own app name */
  readonly appName: string;
  /** A change of a flag reaches the runtimes within this time */
  readonly refreshIntervalMilliseconds: number;
  readonly log: Logger;
}

export interface UnleashSwitchesSource extends SwitchesSource {
  /**
   * Resolves with true after the first answer of Unleash, or with false
   * after the time limit
   */
  readonly waitUntilReady: (timeoutMilliseconds: number) => Promise<boolean>;
}

/**
 * The switches from the Unleash client of Node.js. The client polls the
 * flags and keeps them in memory, thus each read is synchronous. The flags
 * are kill switches: until the first answer of Unleash, and when Unleash
 * cannot be reached, the client keeps the last known values (at the start:
 * all parts on), like the app.
 */
export const createUnleashSwitchesSource = ({
  url,
  token,
  appName,
  refreshIntervalMilliseconds,
  log,
}: UnleashSwitchesSourceOptions): UnleashSwitchesSource => {
  const source = createSwitchesSource();
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
    const switches = getRemoteControlProgramSwitches((flag) =>
      unleash.isEnabled(flag),
    );
    if (!source.set(switches)) return;

    log.info("The switches of the Remote Control Program changed", {
      isProgramTurnedOff: switches.isProgramTurnedOff,
      turnedOffConnectorIds: switches.turnedOffConnectorIds,
      turnedOffCapabilityIds: switches.turnedOffCapabilityIds,
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
    getSwitches: source.getSwitches,
    subscribe: source.subscribe,
    close: () => {
      source.close();
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
