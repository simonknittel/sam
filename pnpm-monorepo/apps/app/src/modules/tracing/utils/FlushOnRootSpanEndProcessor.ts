import { diag, type Context } from "@opentelemetry/api";
import type {
  ReadableSpan,
  Span,
  SpanProcessor,
} from "@opentelemetry/sdk-trace-node";

/**
 * Anything which holds telemetry back and can send it before its own
 * schedule, for example a `BatchLogRecordProcessor`.
 */
interface Flushable {
  forceFlush: () => Promise<void>;
}

/**
 * Sends the telemetry which is on hold as soon as a root span ends, thus at
 * the end of a request. The serverless function of a deployment freezes
 * directly after the response, usually before the next scheduled send. All
 * other calls go to the wrapped span processor without a change.
 */
export class FlushOnRootSpanEndProcessor implements SpanProcessor {
  constructor(
    private readonly spanProcessor: SpanProcessor,
    private readonly additionalFlushTargets: readonly Flushable[] = [],
  ) {}

  onStart(span: Span, parentContext: Context): void {
    this.spanProcessor.onStart(span, parentContext);
  }

  onEnd(span: ReadableSpan): void {
    this.spanProcessor.onEnd(span);

    // A span whose parent is in this process is not the end of the request. A
    // remote parent belongs to the caller, thus such a span is a root here.
    if (span.parentSpanContext && !span.parentSpanContext.isRemote) return;

    // `onEnd` is synchronous and in the hot path of the request, thus the
    // flush must neither be awaited nor let an error through.
    try {
      void this.forceFlush().catch(logFlushError);
    } catch (error) {
      logFlushError(error);
    }
  }

  forceFlush(): Promise<void> {
    return Promise.all([
      this.spanProcessor.forceFlush(),
      ...this.additionalFlushTargets.map((target) => target.forceFlush()),
    ]).then(() => undefined);
  }

  shutdown(): Promise<void> {
    return this.spanProcessor.shutdown();
  }
}

const logFlushError = (error: unknown) => {
  diag.warn(
    `Flushing the telemetry of a finished root span failed: ${String(error)}`,
  );
};
