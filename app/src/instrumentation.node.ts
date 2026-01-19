import { logs } from "@opentelemetry/api-logs";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  BatchLogRecordProcessor,
  LoggerProvider,
} from "@opentelemetry/sdk-logs";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { PrismaInstrumentation } from "@prisma/instrumentation";
import { env } from "./env";

const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: "sam",
});

const traceExporter = new OTLPTraceExporter({
  url: `${env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`,
});

const sdk = new NodeSDK({
  resource,
  traceExporter,
  instrumentations: [
    getNodeAutoInstrumentations(),
    new PrismaInstrumentation(),
  ],
});

sdk.start();

const loggerProvider = new LoggerProvider({
  resource,
  processors: [
    new BatchLogRecordProcessor(
      new OTLPLogExporter({
        url: `${env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/logs`,
      }),
    ),
  ],
});

logs.setGlobalLoggerProvider(loggerProvider);
