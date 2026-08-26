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
  ParentBasedSampler,
  SamplingDecision,
  type Sampler,
  type SamplingResult,
} from "@opentelemetry/sdk-trace-node";
import {
  ATTR_SERVICE_NAME,
  ATTR_URL_PATH,
} from "@opentelemetry/semantic-conventions";
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

/** Vercel requests this path to keep the function warm. */
const PING_PATH = "/_vercel/ping";

class IgnorePingSampler implements Sampler {
  shouldSample(
    context: Context,
    traceId: string,
    spanName: string,
    spanKind: SpanKind,
    attributes: Attributes,
  ): SamplingResult {
    return {
      decision:
        attributes[ATTR_URL_PATH] === PING_PATH
          ? SamplingDecision.NOT_RECORD
          : SamplingDecision.RECORD_AND_SAMPLED,
    };
  }

  toString(): string {
    return "IgnorePingSampler";
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
    getNodeAutoInstrumentations({
      // Prisma instruments the same queries and its spans carry the SQL, thus
      // the spans of the driver only double the volume of each trace.
      "@opentelemetry/instrumentation-pg": { enabled: false },
    }),
    new PrismaInstrumentation(),
  ],
  // Only the root span of a request carries the path. The wrapper hands the
  // decision of the root to all children, thus a ping creates no span at all.
  sampler: new ParentBasedSampler({ root: new IgnorePingSampler() }),
});

sdk.start();

process.on("SIGTERM", () => {
  void sdk.shutdown().then(() => process.exit(0));
});
