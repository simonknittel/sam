import type { Logger } from "@sam-monorepo/application";
import {
  getRemoteControlProgramSwitches,
  type RemoteControlProgramSwitches,
} from "@sam-monorepo/domain";
import { InMemStorageProvider, Unleash, UnleashEvents } from "unleash-client";
import { describeError } from "./logger.js";

/**
 * The switches of the organization (the Unleash flags of
 * `RemoteControlProgramUnleashFlag`, decision 7 of the plan). The relay
 * service gives them to the use cases (the port
 * `remoteControlProgramSwitches`), sends them to the runtimes, and closes
 * all connections when the full program turns off.
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

/** Each part is on: the switches without Unleash */
export const ALL_PARTS_ON: RemoteControlProgramSwitches =
  getRemoteControlProgramSwitches(() => false);

/** The relay service without the configuration of Unleash */
export const createFixedSwitchesSource = (
  switches: RemoteControlProgramSwitches = ALL_PARTS_ON,
): SwitchesSource => ({
  getSwitches: () => switches,
  subscribe: () => () => undefined,
  close: () => undefined,
});

/** The maximum time of one request to Unleash */
const UNLEASH_REQUEST_TIMEOUT_MILLISECONDS = 5_000;

const areSwitchesEqual = (
  first: RemoteControlProgramSwitches,
  second: RemoteControlProgramSwitches,
) =>
  first.isProgramTurnedOff === second.isProgramTurnedOff &&
  first.turnedOffConnectorIds.join() === second.turnedOffConnectorIds.join() &&
  first.turnedOffCapabilityIds.join() === second.turnedOffCapabilityIds.join();

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
  const listeners = new Set<(switches: RemoteControlProgramSwitches) => void>();
  const ready = Promise.withResolvers<void>();
  let isReady = false;
  let switches = ALL_PARTS_ON;

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
    const nextSwitches = getRemoteControlProgramSwitches((flag) =>
      unleash.isEnabled(flag),
    );
    if (areSwitchesEqual(switches, nextSwitches)) return;

    switches = nextSwitches;
    log.info("The switches of the Remote Control Program changed", {
      isProgramTurnedOff: switches.isProgramTurnedOff,
      turnedOffConnectorIds: switches.turnedOffConnectorIds,
      turnedOffCapabilityIds: switches.turnedOffCapabilityIds,
    });
    for (const listener of listeners) listener(switches);
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
    getSwitches: () => switches,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    close: () => {
      listeners.clear();
      unleash.destroy();
    },
    waitUntilReady: async (timeoutMilliseconds) => {
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        return await Promise.race([
          ready.promise.then(() => true),
          new Promise<boolean>((resolve) => {
            timeout = setTimeout(() => resolve(false), timeoutMilliseconds);
          }),
        ]);
      } finally {
        clearTimeout(timeout);
      }
    },
  };
};
