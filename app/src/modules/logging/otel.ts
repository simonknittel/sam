import { env } from "@/env";
import { logs, SeverityNumber } from "@opentelemetry/api-logs";
import { type LogEntry, type LogOutput } from "./types";

// Map log levels to OpenTelemetry severity numbers
const getSeverityNumber = (level: LogEntry["level"]): SeverityNumber => {
  switch (level) {
    case "info":
      return SeverityNumber.INFO;
    case "warn":
      return SeverityNumber.WARN;
    case "error":
      return SeverityNumber.ERROR;
  }
};

export const logToOTel: LogOutput = (logEntry) => {
  if (env.ENABLE_INSTRUMENTATION !== "true") return;
  if (!env.OTEL_EXPORTER_OTLP_PROTOCOL || !env.OTEL_EXPORTER_OTLP_ENDPOINT)
    return;

  try {
    const loggerProvider = logs.getLoggerProvider();
    const logger = loggerProvider.getLogger("sam-app", "1.0.0");

    // Extract message and other attributes
    const { timestamp, level, message, host, commitSha, stack, ...attributes } =
      logEntry;

    logger.emit({
      severityNumber: getSeverityNumber(level),
      severityText: level,
      body: message,
      timestamp: new Date(timestamp).getTime(),
      attributes: {
        host,
        ...(commitSha && { commitSha }),
        ...(stack && { stack }),
        ...attributes,
      },
    });
  } catch (error) {
    // Fallback to console if OTel logging fails
    console.error("Failed to emit log to OTel:", error);
  }
};
