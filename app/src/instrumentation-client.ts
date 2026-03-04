import { init } from "@plausible-analytics/tracker";
import { env } from "./env";

if (env.NEXT_PUBLIC_HOST && env.NEXT_PUBLIC_PLAUSIBLE_ENDPOINT) {
  init({
    domain: env.NEXT_PUBLIC_HOST,
    endpoint: env.NEXT_PUBLIC_PLAUSIBLE_ENDPOINT,
    outboundLinks: true,
  });
}
