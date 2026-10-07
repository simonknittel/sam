import {
  diag,
  DiagConsoleLogger,
  DiagLogLevel,
  type Attributes,
  type Context,
  type SpanKind,
} from "@opentelemetry/api";
import { OTLPTraceExporter as OTLPJsonTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPTraceExporter as OTLPProtobufTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { AwsInstrumentation } from "@opentelemetry/instrumentation-aws-sdk";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { UndiciInstrumentation } from "@opentelemetry/instrumentation-undici";
import { NodeSDK } from "@opentelemetry/sdk-node";
import {
  BatchSpanProcessor,
  ParentBasedSampler,
  SamplingDecision,
  type Sampler,
  type SamplingResult,
} from "@opentelemetry/sdk-trace-node";
import { ATTR_URL_PATH } from "@opentelemetry/semantic-conventions";
import { PrismaInstrumentation } from "@prisma/instrumentation";
import { env } from "./env";
import { FlushOnRootSpanEndProcessor } from "./modules/tracing/utils/FlushOnRootSpanEndProcessor";

// API reference: https://open-telemetry.github.io/opentelemetry-js/

// The SDK reports a rejected export and a full queue only through this
// channel. Without a logger, telemetry disappears without any evidence.
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.WARN);

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
    // The HTTP instrumentation uses the stable attribute; the tracer of
    // Next.js, which makes its own root spans, still uses the legacy one.
    const path = attributes[ATTR_URL_PATH] ?? attributes["http.target"];

    return {
      decision:
        path === PING_PATH
          ? SamplingDecision.NOT_RECORD
          : SamplingDecision.RECORD_AND_SAMPLED,
    };
  }

  toString(): string {
    return "IgnorePingSampler";
  }
}

/**
 * The span pipeline is explicit because of the flush wrapper, thus it selects
 * its exporter itself. The SDK makes the log pipeline from the environment
 * variables. Thus OTEL_EXPORTER_OTLP_PROTOCOL sets the format of the spans and
 * of the logs, with the default `http/protobuf` of the SDK. All exporters read
 * the endpoint from OTEL_EXPORTER_OTLP_ENDPOINT.
 */
const createTraceExporter = () => {
  const protocol = env.OTEL_EXPORTER_OTLP_PROTOCOL;

  switch (protocol) {
    case "http/json":
      return new OTLPJsonTraceExporter();

    case "http/protobuf":
    case undefined:
      return new OTLPProtobufTraceExporter();

    default:
      throw new Error(`Unknown OTLP protocol: ${protocol satisfies never}`);
  }
};

const sdk = new NodeSDK({
  serviceName: "sam",
  spanProcessors: [
    new FlushOnRootSpanEndProcessor(
      // One request creates hundreds of spans, and a per-span export discards
      // whichever span ends while 30 sends are already in flight.
      new BatchSpanProcessor(
        createTraceExporter(),
        // Some spans of Next.js end after the root span, thus after the flush
        // of the request. The default of 5 seconds keeps them on hold long
        // enough for a freeze of the function to catch them.
        { scheduledDelayMillis: 1000 },
      ),
    ),
  ],
  // Without this option, the SDK makes an OTLP metrics pipeline from the
  // environment variables. That pipeline sends to `/v1/metrics` of the
  // configured endpoint, which the backend does not serve, thus each send
  // fails with a 404. The app records no metrics of its own, and an empty
  // list registers no meter provider.
  metricReaders: [],
  // Only the libraries that the app uses. The auto-instrumentations package
  // loads and hooks about 40 modules in each cold start. The driver of Prisma
  // (`pg`) stays without an instrumentation: Prisma instruments the same
  // queries and its spans carry the SQL, thus the spans of the driver only
  // double the volume of each trace.
  instrumentations: [
    new HttpInstrumentation(),
    new UndiciInstrumentation(),
    new AwsInstrumentation(),
    new PrismaInstrumentation(),
  ],
  // Only the root span of a request carries the path. The wrapper hands the
  // decision of the root to all children, thus a ping creates no span at all.
  // A caller which sends a sampled traceparent must not lift the filter,
  // therefore the same sampler also decides for a remote parent.
  sampler: new ParentBasedSampler({
    root: new IgnorePingSampler(),
    remoteParentSampled: new IgnorePingSampler(),
  }),
});

sdk.start();

process.on("SIGTERM", () => {
  void sdk.shutdown().then(() => process.exit(0));
});
