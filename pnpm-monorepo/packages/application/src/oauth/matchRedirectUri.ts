import { isLoopbackHostname } from "./constants.js";

const isLoopbackRedirectUrl = (url: URL) =>
  url.protocol === "http:" &&
  isLoopbackHostname(url.hostname) &&
  !url.username &&
  !url.password &&
  !url.hash;

/**
 * The comparison is exact, character for character. The only exception is a
 * loopback redirect URI: a native app gets a random port from the operating
 * system, thus the port is ignored (RFC 8252 section 7.3).
 */
export const matchRedirectUri = (
  registeredUris: readonly string[],
  requestedUri: string,
): string | null => {
  if (registeredUris.includes(requestedUri)) return requestedUri;

  const requestedUrl = URL.parse(requestedUri);
  if (!requestedUrl || !isLoopbackRedirectUrl(requestedUrl)) return null;

  return (
    registeredUris.find((registeredUri) => {
      const registeredUrl = URL.parse(registeredUri);

      return (
        !!registeredUrl &&
        isLoopbackRedirectUrl(registeredUrl) &&
        registeredUrl.hostname === requestedUrl.hostname &&
        registeredUrl.pathname === requestedUrl.pathname &&
        registeredUrl.search === requestedUrl.search
      );
    }) ?? null
  );
};

/** A private-use scheme in reverse domain name form (RFC 8252 section 7.1) */
const PRIVATE_USE_SCHEME = /^[a-z][a-z0-9+-]*(?:\.[a-z0-9+-]+)+:$/;

/**
 * All other schemes are refused, for example `javascript:`, `data:` and `http`
 * on a different host: a redirect to such a URI could run code on the origin of
 * the app or send the code without encryption
 */
export const isPermittedRedirectUri = (redirectUri: string) => {
  const url = URL.parse(redirectUri);
  // RFC 6749 section 3.1.2 forbids a fragment
  if (!url || redirectUri.includes("#")) return false;

  if (url.protocol === "https:") return true;
  if (url.protocol === "http:") return isLoopbackHostname(url.hostname);

  return PRIVATE_USE_SCHEME.test(url.protocol);
};
