import { PrismaInstrumentation } from "@prisma/instrumentation";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { Resource } from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import { env } from "./env";
import {
  LoggerProvider,
  BatchLogRecordProcessor,
} from "@opentelemetry/sdk-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { logs } from "@opentelemetry/api-logs";

export const register = () => {
  if (env.ENABLE_INSTRUMENTATION !== "true") return;
  if (!env.OTEL_EXPORTER_OTLP_PROTOCOL || !env.OTEL_EXPORTER_OTLP_ENDPOINT)
    return;

  // Set up trace exporter
  const traceExporter = new OTLPTraceExporter({
    url: `${env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`,
  });

  // Initialize NodeSDK for traces and instrumentation
  const sdk = new NodeSDK({
    resource: new Resource({
      [ATTR_SERVICE_NAME]: "sam",
      [ATTR_SERVICE_VERSION]: "1.0.0",
    }),
    traceExporter,
    instrumentations: [new PrismaInstrumentation()],
  });

  sdk.start();

  // Set up the logger provider for logs
  const loggerProvider = new LoggerProvider({
    resource: new Resource({
      [ATTR_SERVICE_NAME]: "sam",
      [ATTR_SERVICE_VERSION]: "1.0.0",
    }),
  });
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  loggerProvider.addLogRecordProcessor(
    new BatchLogRecordProcessor(
      new OTLPLogExporter({
        url: `${env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/logs`,
      }),
    ),
  );

  logs.setGlobalLoggerProvider(loggerProvider);
};
