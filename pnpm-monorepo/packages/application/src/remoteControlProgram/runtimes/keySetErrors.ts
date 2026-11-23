import { errors } from "jose";

/**
 * The host cannot read the JSON Web Key Set of the app, thus it cannot
 * verify a token. A temporary error of the host, not a token that is not
 * valid: the relay service closes the connection with the code 1011 and logs
 * an error, and its internal endpoints answer 503.
 */
export class KeySetUnavailableError extends Error {
  override readonly name = "KeySetUnavailableError";

  constructor(
    message = "The JSON Web Key Set of the app cannot be read",
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

/**
 * Tells if an error of `jwtVerify()` comes from the key set of
 * `createRemoteJWKSet()` of `jose`: a timeout (`JWKSTimeout`), an answer
 * that is not a key set (`JWKSInvalid`), or an answer that is not 200 or not
 * JSON. For the last two, the key set throws a plain `JOSEError` (the code
 * `ERR_JOSE_GENERIC`), which no other part of `jose` throws. A failed
 * connection to the app is not a `JOSEError`: `jose` gives the error of
 * `fetch()` unchanged.
 */
export const isKeySetFetchError = (error: unknown) =>
  error instanceof errors.JWKSTimeout ||
  error instanceof errors.JWKSInvalid ||
  (error instanceof errors.JOSEError && error.code === errors.JOSEError.code);
