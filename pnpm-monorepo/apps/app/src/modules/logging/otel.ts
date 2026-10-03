import { env } from "@/env";
import {
  logs,
  SeverityNumber,
  type LoggerProvider,
} from "@opentelemetry/api-logs";
import { LogLevel, type LogEntry, type LogOutput } from "./types";

/**
 * The provider of the API has no `forceFlush`; the provider which the SDK
 * registers (`@opentelemetry/sdk-logs`) has one.
 */
const canForceFlush = (
  loggerProvider: LoggerProvider,
): loggerProvider is LoggerProvider & { forceFlush: () => Promise<void> } =>
  "forceFlush" in loggerProvider &&
  typeof loggerProvider.forceFlush === "function";

const getSeverityNumber = (level: LogEntry["level"]): SeverityNumber => {
  switch (level) {
    case LogLevel.Info:
      return SeverityNumber.INFO;
    case LogLevel.Warn:
      return SeverityNumber.WARN;
    case LogLevel.Error:
      return SeverityNumber.ERROR;
    default:
      throw new Error(`Unknown level: ${level satisfies never}`);
  }
};

export const logToOTel: LogOutput = async (logEntry) => {
  if (
    env.ENABLE_INSTRUMENTATION !== "true" ||
    !env.OTEL_EXPORTER_OTLP_PROTOCOL ||
    !env.OTEL_EXPORTER_OTLP_ENDPOINT
  )
    return;

  try {
    const loggerProvider = logs.getLoggerProvider();
    const logger = loggerProvider.getLogger("sam");

    const { timestamp, level, message, host, commitSha, stack, ...attributes } =
      logEntry;

    logger.emit({
      severityNumber: getSeverityNumber(level),
      severityText: level,
      body: message,
      // A number is epoch milliseconds (see `timeInputToHrTime` of @opentelemetry/core)
      timestamp: new Date(timestamp).getTime(),
      // The SDK keeps a plain object (for example a serialized error) as a
      // nested map and drops a value that is not valid, for example a class
      // instance.
      attributes: {
        host,
        ...(commitSha && { commitSha }),
        ...(stack && { stack }),
        ...attributes,
      },
    });

    // The app writes its log records in `after()`, thus after the response
    // and after the flush which the end of the root span triggers. A
    // serverless function freezes directly after the response, thus a record
    // which waits for the next scheduled send can be lost.
    if (canForceFlush(loggerProvider)) await loggerProvider.forceFlush();
  } catch (error) {
    console.error("Failed to emit log to OTel:", error);
  }
};
