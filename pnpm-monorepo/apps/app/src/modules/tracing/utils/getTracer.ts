import { trace } from "@opentelemetry/api";

export const getTracer = () => {
  return trace.getTracer("sam");
};
