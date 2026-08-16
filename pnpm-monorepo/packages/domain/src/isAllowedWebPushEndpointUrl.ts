/**
 * The subscription endpoint is the target of a server-side POST by the
 * notification-router lambda, so an unvalidated value is an SSRF vector.
 * Browser push services are always public https hosts with DNS names, so
 * anything else — http, IP literals, loopback/link-local/mDNS names — gets
 * rejected. A hostname allowlist is deliberately avoided to not break
 * lesser-known browsers. Enforced when storing a subscription and again
 * defensively before sending.
 */
export const isAllowedWebPushEndpointUrl = (value: string) => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (url.protocol !== "https:") return false;

  const hostname = url.hostname;

  // IPv6 literals keep their brackets in URL.hostname
  if (hostname.startsWith("[")) return false;
  const isIpv4Literal = /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
  if (isIpv4Literal) return false;

  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  )
    return false;

  return true;
};
