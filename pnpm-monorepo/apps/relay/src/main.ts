import type { Logger } from "@sam-monorepo/application";
import { createRelayApplicationContext } from "./applicationContext.js";
import { createFeedEntryDelivery } from "./delivery/index.js";
import type { RelayEnvironment } from "./env.js";
import { createRelayServer } from "./relayServer.js";
import {
  createSwitchesSource,
  createUnleashSwitchesSource,
  type SwitchesSource,
} from "./switches.js";
import type { Telemetry } from "./telemetry.js";
import { MILLISECONDS_PER_SECOND } from "./time.js";

/** Soketi counts 1 KB as 1,024 bytes */
const BYTES_PER_KILOBYTE = 1_024;

/**
 * The relay service accepts connections after the first answer of Unleash,
 * thus a runtime cannot connect while the program is off. Without an answer
 * in this time, all parts are on until the first answer (the kill switches
 * of the app also default to on).
 */
const UNLEASH_READY_TIMEOUT_MILLISECONDS = 10_000;

/**
 * Below the 10 seconds of `docker stop` before it kills the process. Thus
 * the process exits itself, also when a step of the controlled close does
 * not end.
 */
const SHUTDOWN_TIMEOUT_MILLISECONDS = 9_000;

interface RelayServiceOptions {
  readonly environment: RelayEnvironment;
  readonly log: Logger;
  /** Started before this module loads (see `index.ts`) */
  readonly telemetry: Telemetry;
}

/** Composes the relay service, starts it, and stops it at `SIGTERM` and `SIGINT` */
export const runRelayService = async ({
  environment,
  log,
  telemetry,
}: RelayServiceOptions) => {
  const {
    UNLEASH_SERVER_API_URL: unleashUrl,
    UNLEASH_SERVER_API_TOKEN: unleashToken,
  } = environment;
  let switches: SwitchesSource;
  if (unleashUrl && unleashToken) {
    const unleashSwitches = createUnleashSwitchesSource({
      url: unleashUrl,
      token: unleashToken,
      appName: environment.UNLEASH_APP_NAME,
      refreshIntervalMilliseconds:
        environment.UNLEASH_REVALIDATE_SECONDS * MILLISECONDS_PER_SECOND,
      log,
    });
    if (
      !(await unleashSwitches.waitUntilReady(
        UNLEASH_READY_TIMEOUT_MILLISECONDS,
      ))
    )
      log.warn(
        "Unleash did not answer in time: all parts of the program are on until its first answer",
      );
    switches = unleashSwitches;
  } else {
    log.warn("No Unleash is configured: all parts of the program are on");
    switches = createSwitchesSource();
  }

  const { context, keySet, isDatabaseAvailable, disconnectDatabase } =
    createRelayApplicationContext({ environment, log, switches });

  const delivery = createFeedEntryDelivery({
    context,
    maximumEventPayloadBytes:
      environment.PUSHER_CHANNELS_MAXIMUM_EVENT_PAYLOAD_KILOBYTES *
      BYTES_PER_KILOBYTE,
  });
  const server = createRelayServer({
    context,
    delivery,
    switches,
    keySet,
    isDatabaseAvailable,
    appOrigin: new URL(environment.APP_ORIGIN ?? environment.APP_BASE_URL)
      .origin,
  });

  const port = await server.listen(environment.PORT);
  log.info("The relay service listens", { port });

  let isStopping = false;
  const stop = async (signal: NodeJS.Signals) => {
    if (isStopping) return;
    isStopping = true;
    log.info("The relay service stops", { signal });
    setTimeout(() => {
      log.error("The controlled close of the relay service took too long");
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MILLISECONDS).unref();

    try {
      // The uploads stop first, then the delivery sends the waiting entries
      await server.close();
      await delivery.close();
      switches.close();
      await telemetry.shutdown();
      await disconnectDatabase();
      log.info("The relay service stopped");
      process.exit(0);
    } catch (error) {
      log.error("The controlled close of the relay service failed", { error });
      process.exit(1);
    }
  };

  process.once("SIGTERM", (signal) => void stop(signal));
  process.once("SIGINT", (signal) => void stop(signal));
};
