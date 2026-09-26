import { init } from "@plausible-analytics/tracker";

/**
 * Reads the build-inlined values directly instead of through `env`: this
 * file runs on every page, and the `env` module would put Zod into the
 * bundle of the public pages too. `env.ts` still validates both values at
 * build time. The host falls back to the base URL like in `env.ts`, but not
 * to its local default: without a real host, no tracking starts.
 */
const host =
  process.env.NEXT_PUBLIC_HOST ||
  process.env.NEXT_PUBLIC_BASE_URL?.replace(/https?:\/\//, "");
const endpoint = process.env.NEXT_PUBLIC_PLAUSIBLE_ENDPOINT;

if (host && endpoint) {
  init({
    domain: host,
    endpoint,
    outboundLinks: true,
  });
}
