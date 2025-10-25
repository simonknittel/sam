import { SpanStatusCode } from "@opentelemetry/api";
import { getTracer } from "./getTracer";

export const withTrace = <TArgs extends unknown[], TResult>(
  name: string,
  fn: (...args: TArgs) => Promise<TResult>,
) => {
  return (...args: TArgs): Promise<TResult> => {
    return getTracer().startActiveSpan(name, async (span): Promise<TResult> => {
      try {
        return await fn(...args);
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
        });
        throw error;
      } finally {
        span.end();
      }
    });
  };
};
