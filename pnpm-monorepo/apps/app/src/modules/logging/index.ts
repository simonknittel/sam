import { env } from "@/env";
import { after } from "next/server";
import { serializeError } from "serialize-error";
import { logToConsole } from "./console";
import { logToOTel } from "./otel";
import { LogLevel, type LogEntry } from "./types";

/**
 * `JSON.stringify()` gives `{}` for an `Error`, and the OpenTelemetry SDK
 * drops an attribute that is an `Error`. Thus each argument that is an
 * `Error` becomes a plain object.
 */
const serializeErrors = (args: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(args).map(([key, value]) => [
      key,
      value instanceof Error ? serializeError(value) : value,
    ]),
  );

const createLogLevel =
  (level: LogLevel) =>
  (message: string, args: Record<string, unknown> = {}) => {
    // In `after()`, the timestamp and the stack would show the time after the
    // response and the deferred callback instead of the call.
    const logEntry: LogEntry = {
      ...serializeErrors(args),
      timestamp: new Date().toISOString(),
      level,
      message,
      host: env.NEXT_PUBLIC_HOST,
      stack: new Error().stack,
      ...(env.COMMIT_SHA && { commitSha: env.COMMIT_SHA }),
    };

    after(async () => {
      await Promise.all([logToConsole(logEntry), logToOTel(logEntry)]);
    });
  };

export const log = {
  info: createLogLevel(LogLevel.Info),
  warn: createLogLevel(LogLevel.Warn),
  error: createLogLevel(LogLevel.Error),
};
