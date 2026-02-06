import { env } from "@/env";
import { logs, SeverityNumber } from "@opentelemetry/api-logs";
import { LogLevel, type LogEntry, type LogOutput } from "./types";

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

export const logToOTel: LogOutput = (logEntry) => {
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
      // Should be nanoseconds according to the type comment, but it doesn't work when multiplying by 1_000_000
      timestamp: new Date(timestamp).getTime(),
      attributes: {
        host,
        ...(commitSha && { commitSha }),
        ...(stack && { stack }),
        ...attributes,
      },
    });
  } catch (error) {
    console.error("Failed to emit log to OTel:", error);
  }
};
