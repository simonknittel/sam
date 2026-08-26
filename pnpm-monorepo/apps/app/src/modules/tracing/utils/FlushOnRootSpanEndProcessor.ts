import { diag, type Context } from "@opentelemetry/api";
import type {
  ReadableSpan,
  Span,
  SpanProcessor,
} from "@opentelemetry/sdk-trace-node";

/**
 * Sends the spans which are on hold as soon as a root span ends, thus at the
 * end of a request. Without this, the serverless function of a deployment
 * freezes after the response and the spans of the request wait in the buffer
 * until the function operates again.
 *
 * The send starts before the freeze, but nothing keeps the function alive
 * until it is complete: `after()` of Next.js does that, and it refuses a call
 * from here, because `onEnd` runs outside the scope of the request. Spans
 * which end after the root span thus stay on hold — see the note about
 * `scheduledDelayMillis` in instrumentation.node.ts.
 *
 * All calls go to the wrapped span processor without a change.
 */
export class FlushOnRootSpanEndProcessor implements SpanProcessor {
  constructor(private readonly spanProcessor: SpanProcessor) {}

  onStart(span: Span, parentContext: Context): void {
    this.spanProcessor.onStart(span, parentContext);
  }

  onEnding(span: Span): void {
    this.spanProcessor.onEnding?.(span);
  }

  onEnd(span: ReadableSpan): void {
    this.spanProcessor.onEnd(span);

    // A span whose parent is in this process is not the end of the request. A
    // remote parent belongs to the caller, thus such a span is a root here.
    if (span.parentSpanContext && !span.parentSpanContext.isRemote) return;

    // `onEnd` is synchronous and in the hot path of the request, thus the
    // flush must neither be awaited nor let an error through.
    void this.forceFlush().catch((error: unknown) => {
      diag.warn(
        `Flushing the spans of a finished root span failed: ${String(error)}`,
      );
    });
  }

  // `async` and not a plain delegation, so that a wrapped processor which
  // throws immediately also becomes a rejected promise for `onEnd`.
  async forceFlush(): Promise<void> {
    await this.spanProcessor.forceFlush();
  }

  shutdown(): Promise<void> {
    return this.spanProcessor.shutdown();
  }
}
