import type { Context, SpanContext } from "@opentelemetry/api";
import type { ReadableSpan, Span } from "@opentelemetry/sdk-trace-node";
import { describe, expect, it, vi } from "vitest";
import { FlushOnRootSpanEndProcessor } from "./FlushOnRootSpanEndProcessor";

const createWrappedProcessor = () => ({
  onStart: vi.fn(),
  onEnding: vi.fn(),
  onEnd: vi.fn(),
  forceFlush: vi.fn(() => Promise.resolve()),
  shutdown: vi.fn(() => Promise.resolve()),
});

const createSpan = (parentSpanContext?: Partial<SpanContext>) =>
  ({ parentSpanContext }) as ReadableSpan;

describe("FlushOnRootSpanEndProcessor", () => {
  it("passes every call on to the wrapped span processor", async () => {
    const wrappedProcessor = createWrappedProcessor();
    const processor = new FlushOnRootSpanEndProcessor(wrappedProcessor);
    const span = createSpan({ isRemote: false });
    const context = {} as Context;

    processor.onStart(span as unknown as Span, context);
    processor.onEnding(span as unknown as Span);
    processor.onEnd(span);
    await processor.forceFlush();
    await processor.shutdown();

    expect(wrappedProcessor.onStart).toHaveBeenCalledWith(span, context);
    expect(wrappedProcessor.onEnding).toHaveBeenCalledWith(span);
    expect(wrappedProcessor.onEnd).toHaveBeenCalledWith(span);
    expect(wrappedProcessor.forceFlush).toHaveBeenCalledOnce();
    expect(wrappedProcessor.shutdown).toHaveBeenCalledOnce();
  });

  it("flushes when a span without a parent ends", () => {
    const wrappedProcessor = createWrappedProcessor();
    const processor = new FlushOnRootSpanEndProcessor(wrappedProcessor);

    processor.onEnd(createSpan());

    expect(wrappedProcessor.forceFlush).toHaveBeenCalledOnce();
  });

  it("flushes when a span with a remote parent ends", () => {
    const wrappedProcessor = createWrappedProcessor();
    const processor = new FlushOnRootSpanEndProcessor(wrappedProcessor);

    processor.onEnd(createSpan({ isRemote: true }));

    expect(wrappedProcessor.forceFlush).toHaveBeenCalledOnce();
  });

  it("does not flush when a span with a local parent ends", () => {
    const wrappedProcessor = createWrappedProcessor();
    const processor = new FlushOnRootSpanEndProcessor(wrappedProcessor);

    processor.onEnd(createSpan({ isRemote: false }));

    expect(wrappedProcessor.forceFlush).not.toHaveBeenCalled();
  });

  it("swallows a failed flush", async () => {
    const wrappedProcessor = createWrappedProcessor();
    wrappedProcessor.forceFlush.mockRejectedValue(new Error("export failed"));
    const processor = new FlushOnRootSpanEndProcessor(wrappedProcessor);

    expect(() => processor.onEnd(createSpan())).not.toThrow();
    await vi.waitFor(() =>
      expect(wrappedProcessor.forceFlush).toHaveBeenCalledOnce(),
    );
  });

  it("swallows a flush which throws immediately", () => {
    const wrappedProcessor = createWrappedProcessor();
    wrappedProcessor.forceFlush.mockImplementation(() => {
      throw new Error("no exporter");
    });
    const processor = new FlushOnRootSpanEndProcessor(wrappedProcessor);

    expect(() => processor.onEnd(createSpan())).not.toThrow();
  });
});
