/**
 * Long enough to spare clients a fetch for each connection, short enough
 * that a change of the documents reaches the clients soon. The same value as
 * the JWKS route.
 */
const METADATA_CACHE_MAX_AGE_IN_SECONDS = 5 * 60;

/**
 * The OAuth endpoints use no cookies, and browser-based MCP clients (for
 * example the MCP Inspector or the hosted callback of Claude.ai) call them
 * from a different origin
 */
export const CORS_HEADERS = { "Access-Control-Allow-Origin": "*" };

export const metadataResponse = (document: object) =>
  Response.json(document, {
    headers: {
      ...CORS_HEADERS,
      "Cache-Control": `public, max-age=${METADATA_CACHE_MAX_AGE_IN_SECONDS}, s-maxage=${METADATA_CACHE_MAX_AGE_IN_SECONDS}`,
    },
  });

export const corsPreflightResponse = (
  allowedMethods: string,
  allowedHeaders: string,
) =>
  new Response(null, {
    status: 204,
    headers: {
      ...CORS_HEADERS,
      "Access-Control-Allow-Methods": allowedMethods,
      "Access-Control-Allow-Headers": allowedHeaders,
    },
  });

/** Tokens must not go into a cache (RFC 6749 section 5.1) */
export const tokenEndpointResponse = (body: object | null, status = 200) => {
  const init = {
    status,
    headers: {
      ...CORS_HEADERS,
      "Cache-Control": "no-store",
      Pragma: "no-cache",
    },
  };

  return body ? Response.json(body, init) : new Response(null, init);
};

/** The kill switch is on, or the app cannot issue tokens */
export const temporarilyUnavailableResponse = () =>
  tokenEndpointResponse({ error: "temporarily_unavailable" }, 503);
