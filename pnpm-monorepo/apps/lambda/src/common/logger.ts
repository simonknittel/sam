import { serializeError } from "serialize-error";

enum LogLevel {
  Info = "info",
  Warn = "warn",
  Error = "error",
}

/**
 * The Lambda runtime serializes an `Error` without its `cause`. Thus each
 * field that is an `Error` becomes a plain object.
 */
const serializeErrors = (fields: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [
      key,
      value instanceof Error ? serializeError(value) : value,
    ]),
  );

/**
 * The functions use the JSON log format (see the Terraform modules). Thus the
 * Lambda runtime writes each console call as one JSON object, with the
 * timestamp, the level and the request ID. This object becomes its `message`
 * field.
 */
const createLogLevel =
  (level: LogLevel) =>
  (message: string, fields: Record<string, unknown> = {}) => {
    console[level]({
      ...serializeErrors(fields),
      message,
      /** The stack of the call, also for entries without an error */
      stack: new Error().stack,
    });
  };

export const log = {
  info: createLogLevel(LogLevel.Info),
  warn: createLogLevel(LogLevel.Warn),
  error: createLogLevel(LogLevel.Error),
};
