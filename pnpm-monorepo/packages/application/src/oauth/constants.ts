import { REMOTE_CONTROL_PROGRAM_SCOPE } from "@sam-monorepo/domain";

/** The only scope of the MCP server. It gives the permissions of the user. */
export const MCP_SCOPE = "mcp";

/**
 * Accepted in an authorization request, but without an effect: the
 * authorization code grant always gives a refresh token
 */
export const OFFLINE_ACCESS_SCOPE = "offline_access";

export const SUPPORTED_SCOPES: readonly string[] = [
  MCP_SCOPE,
  REMOTE_CONTROL_PROGRAM_SCOPE,
  OFFLINE_ACCESS_SCOPE,
];

export const ACCESS_TOKEN_LIFETIME_IN_SECONDS = 60 * 60;

/** 31 days after the issue of each token, thus the lifetime slides */
export const REFRESH_TOKEN_LIFETIME_IN_MILLISECONDS = 31 * 24 * 60 * 60 * 1000;

/**
 * After its replacement, a refresh token can be used once more within this
 * time while its replacement is unused: the client did not get the answer,
 * for example after a lost network connection or a quit (see
 * `refreshAccessToken()`). Long enough for a retry of a client, short enough
 * for the detection of a stolen token.
 */
export const REFRESH_TOKEN_GRACE_TIME_IN_MILLISECONDS = 60 * 1000;

/** 10 minutes, the maximum that RFC 6749 section 4.1.2 recommends */
export const AUTHORIZATION_CODE_LIFETIME_IN_MILLISECONDS = 10 * 60 * 1000;

/**
 * The maximum length of a URL in a request (client id, redirect URI,
 * resource). Real URLs are much shorter. The limit keeps large values out of
 * the database and the logs.
 */
export const MAX_URL_LENGTH = 2048;

export const MAX_OPAQUE_TOKEN_LENGTH = 512;

/**
 * A PKCE code verifier or code challenge: 43 to 128 characters of the
 * unreserved set (RFC 7636 section 4.1)
 */
export const PKCE_VALUE = /^[A-Za-z0-9\-._~]{43,128}$/;

/** URL hostnames of the loopback interface (RFC 8252 section 7.3) */
const LOOPBACK_HOSTNAMES: readonly string[] = [
  "localhost",
  "127.0.0.1",
  // `URL.hostname` keeps the brackets of an IPv6 address
  "[::1]",
];

export const isLoopbackHostname = (hostname: string) =>
  LOOPBACK_HOSTNAMES.includes(hostname);
