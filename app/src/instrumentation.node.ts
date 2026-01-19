import type { Attributes, Context, SpanKind } from "@opentelemetry/api";
import { logs } from "@opentelemetry/api-logs";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  LoggerProvider,
  SimpleLogRecordProcessor,
} from "@opentelemetry/sdk-logs";
import { NodeSDK } from "@opentelemetry/sdk-node";
import {
  BatchSpanProcessor,
  SamplingDecision,
  type Sampler,
  type SamplingResult,
} from "@opentelemetry/sdk-trace-node";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { PrismaInstrumentation } from "@prisma/instrumentation";
import { env } from "./env";

// API reference: https://open-telemetry.github.io/opentelemetry-js/

const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: "sam",
});

class MySampler implements Sampler {
  shouldSample(
    context: Context,
    traceId: string,
    spanName: string,
    spanKind: SpanKind,
    attributes: Attributes,
  ): SamplingResult {
    return {
      decision:
        attributes["http.target"] === "/_vercel/ping"
          ? SamplingDecision.NOT_RECORD
          : SamplingDecision.RECORD_AND_SAMPLED,
    };
  }

  toString(): string {
    return "My Sampler";
  }
}

const sdk = new NodeSDK({
  resource,
  spanProcessors: [
    new BatchSpanProcessor(
      new OTLPTraceExporter({
        url: `${env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`,
      }),
      {
        scheduledDelayMillis: 1000,
      },
    ),
  ],
  logRecordProcessors: [
    // new BatchLogRecordProcessor(
    //   new OTLPLogExporter({
    //     url: `${env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/logs`,
    //   }),
    //   {
    //     scheduledDelayMillis: 1000,
    //   },
    // ),
    new SimpleLogRecordProcessor(
      new OTLPLogExporter({
        url: `${env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/logs`,
      }),
    ),
  ],
  instrumentations: [
    getNodeAutoInstrumentations(),
    new PrismaInstrumentation(),
  ],
  sampler: new MySampler(),
});

sdk.start();

const loggerProvider = new LoggerProvider();

logs.setGlobalLoggerProvider(loggerProvider);

process.on("SIGTERM", () => {
  void sdk.shutdown().then(() => process.exit(0));
});
