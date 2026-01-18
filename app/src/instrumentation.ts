import { PrismaInstrumentation } from "@prisma/instrumentation";
import { registerOTel } from "@vercel/otel";
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

  // Register traces and other instrumentation
  registerOTel({
    serviceName: "sam",
    instrumentations: [new PrismaInstrumentation()],
  });

  // Manually set up the logger provider for logs
  const loggerProvider = new LoggerProvider();
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
