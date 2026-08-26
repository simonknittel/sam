import {
  diag,
  DiagConsoleLogger,
  DiagLogLevel,
  type Attributes,
  type Context,
  type SpanKind,
} from "@opentelemetry/api";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
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
import { FlushOnRootSpanEndProcessor } from "./modules/tracing/utils/FlushOnRootSpanEndProcessor";

// API reference: https://open-telemetry.github.io/opentelemetry-js/

// The SDK reports a rejected export and a full queue only through this
// channel. Without a logger, telemetry disappears without any evidence.
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.WARN);

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

const logRecordProcessor = new BatchLogRecordProcessor({
  exporter: new OTLPLogExporter({
    url: `${env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/logs`,
  }),
});

const sdk = new NodeSDK({
  resource,
  spanProcessors: [
    // One request creates hundreds of spans, and a per-span export discards
    // whichever span ends while 30 sends are already in flight.
    new FlushOnRootSpanEndProcessor(
      new BatchSpanProcessor(
        new OTLPTraceExporter({
          url: `${env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`,
        }),
      ),
      [logRecordProcessor],
    ),
  ],
  logRecordProcessors: [logRecordProcessor],
  instrumentations: [
    getNodeAutoInstrumentations(),
    new PrismaInstrumentation(),
  ],
  sampler: new MySampler(),
});

sdk.start();

process.on("SIGTERM", () => {
  void sdk.shutdown().then(() => process.exit(0));
});
