import { diag, DiagLogLevel, type DiagLogger } from "@opentelemetry/api";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-proto";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace";
import type { Logger } from "@sam-monorepo/application";
import type { RelayEnvironment } from "./env.js";

// API reference: https://open-telemetry.github.io/opentelemetry-js/

export interface Telemetry {
  /** Sends the waiting spans and metrics, and then stops the SDK */
  readonly shutdown: () => Promise<void>;
}

/**
 * Writes the reports of the SDK (for example a refused export) as JSON
 * lines. Without a logger, telemetry disappears without any evidence.
 */
const createDiagLogger = (log: Logger): DiagLogger => {
  const ignore = () => undefined;

  return {
    error: (message, ...args) =>
      log.error(`OpenTelemetry: ${message}`, { details: args.map(String) }),
    warn: (message, ...args) =>
      log.warn(`OpenTelemetry: ${message}`, { details: args.map(String) }),
    info: ignore,
    debug: ignore,
    verbose: ignore,
  };
};

/**
 * Starts the OpenTelemetry SDK with the metrics and the traces (decision 9
 * of the plan), only when `OTEL_EXPORTER_OTLP_ENDPOINT` is set. The
 * exporters send `http/protobuf`, like the app, and read the endpoint and
 * the headers from the `OTEL_EXPORTER_OTLP_*` variables. Without the SDK,
 * the API of OpenTelemetry records nothing. The logs go to the standard
 * output of the container, not to OpenTelemetry.
 *
 * Start it before the modules that make meters (see `index.ts`).
 */
export const startTelemetry = ({
  environment,
  log,
}: {
  readonly environment: RelayEnvironment;
  readonly log: Logger;
}): Telemetry => {
  if (!environment.OTEL_EXPORTER_OTLP_ENDPOINT)
    return { shutdown: async () => undefined };

  diag.setLogger(createDiagLogger(log), DiagLogLevel.WARN);

  const sdk = new NodeSDK({
    serviceName: environment.OTEL_SERVICE_NAME,
    spanProcessors: [
      new BatchSpanProcessor({ exporter: new OTLPTraceExporter() }),
    ],
    metricReaders: [
      new PeriodicExportingMetricReader({ exporter: new OTLPMetricExporter() }),
    ],
    // An empty list stops the SDK from making a log pipeline from the environment
    logRecordProcessors: [],
    // The use cases make the spans of the database work (`withSpan`)
    instrumentations: [],
  });
  sdk.start();

  return { shutdown: () => sdk.shutdown() };
};
