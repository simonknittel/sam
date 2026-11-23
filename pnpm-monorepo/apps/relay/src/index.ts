import * as z from "zod";
import { parseRelayEnvironment, type RelayEnvironment } from "./env.js";
import { createJsonLogger } from "./logger.js";
import { startTelemetry } from "./telemetry.js";

/**
 * The relay service of the Remote Control Program (see
 * `docs/remote-control-program/README.md#relay`)
 */

const log = createJsonLogger();

// The logs get each error as a JSON line without personal data (`describeError()`)
process.on("uncaughtException", (error) => {
  log.error("An uncaught error stopped the relay service", { error });
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  log.error("An unhandled rejection stopped the relay service", {
    error: reason,
  });
  process.exit(1);
});

let environment: RelayEnvironment;
try {
  environment = parseRelayEnvironment(process.env);
} catch (error) {
  // The issues name the variables, not their values
  log.error("The environment of the relay service is not valid", {
    issues:
      error instanceof z.ZodError
        ? error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          }))
        : [],
  });
  process.exit(1);
}

const telemetry = startTelemetry({ environment, log });

// The other modules load after the start of the SDK: a meter that a module makes before the start records nothing
const { runRelayService } = await import("./main.js");
await runRelayService({ environment, log, telemetry });
