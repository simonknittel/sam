/**
 * Signature algorithm of every embed token. Also published in the JWKS so
 * verifiers can pin it instead of trusting the token header.
 */
export const EMBED_TOKEN_ALGORITHM = "ES256";

/**
 * Query parameter of the token in an embed URL, unless the embed
 * configuration of the app sets a different one (see `EmbedAuthentication`).
 */
export const DEFAULT_EMBED_TOKEN_QUERY_PARAMETER = "jwt";

/**
 * Lifetime of a token, unless the embed configuration of the app sets a
 * different one (see `EmbedAuthentication`). For an app that exchanges the
 * token for its own session while it loads, the token is a handshake
 * credential: the lifetime only limits the first load, not the time that the
 * iframe can stay open. The lifetime is short because the token is in a
 * query string and thus goes into access logs, the browser history and
 * outbound `Referer` headers.
 */
export const DEFAULT_EMBED_TOKEN_LIFETIME_IN_SECONDS = 5 * 60;
