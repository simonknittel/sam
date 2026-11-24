/**
 * The error codes of the token endpoint (RFC 6749 section 5.2) and of the
 * resource indicators (RFC 8707 section 2)
 */
export enum OAuthTokenErrorCode {
  InvalidRequest = "invalid_request",
  InvalidClient = "invalid_client",
  InvalidGrant = "invalid_grant",
  UnsupportedGrantType = "unsupported_grant_type",
  InvalidScope = "invalid_scope",
  InvalidTarget = "invalid_target",
}

/**
 * An error of the token endpoint. The route gives it to the client as the
 * JSON of RFC 6749 section 5.2. The description goes to the client, thus it
 * must not contain a token or internal data.
 */
export class OAuthTokenError extends Error {
  override readonly name = "OAuthTokenError";

  constructor(
    readonly error: OAuthTokenErrorCode,
    readonly description: string,
    options?: ErrorOptions,
  ) {
    super(description, options);
  }
}

/**
 * The access token is not valid: a bad signature, an incorrect issuer or
 * audience, an expired token, a revoked grant or a banned user. The MCP
 * endpoint answers `401` with the `invalid_token` challenge.
 */
export class InvalidTokenError extends Error {
  override readonly name = "InvalidTokenError";

  constructor(
    message = "The access token is not valid",
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

/**
 * The app has no signing key, thus it cannot issue or verify access tokens.
 * The token endpoint answers `503`.
 */
export class SigningKeyUnavailableError extends Error {
  override readonly name = "SigningKeyUnavailableError";

  constructor(
    message = "No signing key is configured",
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}
