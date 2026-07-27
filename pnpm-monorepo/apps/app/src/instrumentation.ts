import { env } from "./env";

export const register = async () => {
  if (
    env.ENABLE_INSTRUMENTATION !== "true" ||
    !env.OTEL_EXPORTER_OTLP_PROTOCOL ||
    !env.OTEL_EXPORTER_OTLP_ENDPOINT
  )
    return;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation.node");
  }
};
