import { SpanStatusCode } from "@opentelemetry/api";
import { unstable_rethrow } from "next/navigation";
import { getTracer } from "./getTracer";

export const withTrace = <TArgs extends unknown[], TResult>(
  name: string,
  fn: (...args: TArgs) => Promise<TResult> | TResult,
) => {
  return (...args: TArgs): Promise<TResult> => {
    return getTracer().startActiveSpan(name, async (span): Promise<TResult> => {
      try {
        return await fn(...args);
      } catch (error) {
        // Next.js controls the flow with errors, for example for `redirect()`
        // and `notFound()`. Such an error is not a failure of the span.
        unstable_rethrow(error);
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
