/**
 * Signature algorithm of every embed token. Also published in the JWKS so
 * verifiers can pin it instead of trusting the token header.
 */
export const EMBED_TOKEN_ALGORITHM = "ES256";

/**
 * Query parameter the token is appended to an embed URL under. Shared
 * between minting and docs/embedded-app-authentication.md rather than
 * configurable per app, since nothing currently needs a second name.
 */
export const EMBED_TOKEN_QUERY_PARAMETER = "jwt";

/**
 * The token is a handshake credential: the embedded app exchanges it for
 * its own session while loading, so this only constrains the initial load,
 * not how long the iframe may stay open. Kept short because the token rides
 * in a query string and therefore reaches access logs, browser history and
 * outbound `Referer` headers.
 */
export const EMBED_TOKEN_LIFETIME_IN_SECONDS = 5 * 60;
