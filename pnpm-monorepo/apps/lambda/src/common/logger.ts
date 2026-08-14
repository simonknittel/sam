import { serializeError } from "serialize-error";
import { getRequestContext, type RequestContext } from "./requestContext";

interface LogEntry {
  /** ISO string of the date (`new Date().toISOString()`) */
  timestamp: string;
  message: string;
  level: "info" | "warn" | "error";
  /** Stack trace for every log entry, not only errors. Also, the original stack trace sometimes doesn't contain the full stack trace. */
  requestId?: RequestContext["requestId"];
  stack: string;
  /** Any other serialized arguments */
  [key: string]: string | number | boolean | undefined | null;
}

const createLogLevel =
  (level: LogEntry["level"]) =>
  async (message: string, args: Record<string, unknown> = {}) => {
    const { error, ...remainingArgs } = args;

    let requestContext: RequestContext | undefined;
    try {
      requestContext = getRequestContext();
    } catch {}

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      message,
      level,
      ...(requestContext ? { requestId: requestContext.requestId } : {}),
      stack: new Error().stack!,
      ...(error
        ? { serializedError: JSON.stringify(serializeError(error)) }
        : {}),
      ...remainingArgs,
    };

    if (process.env.NODE_ENV === "production") {
      console[level](JSON.stringify(logEntry));
    } else {
      console[level](logEntry);
    }
  };

export const log = {
  info: createLogLevel("info"),
  warn: createLogLevel("warn"),
  error: createLogLevel("error"),
};
