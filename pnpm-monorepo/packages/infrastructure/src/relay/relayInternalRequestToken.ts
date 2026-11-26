import {
  isKeySetFetchError,
  KeySetUnavailableError,
  SIGNING_KEY_ALGORITHM,
  type SigningKey,
} from "@sam-monorepo/application";
import { errors, jwtVerify, SignJWT, type JWTVerifyGetKey } from "jose";
import * as z from "zod";

/**
 * The tokens of the internal requests of the app to the relay service of the
 * Remote Control Program. The app signs them with its signing key (ES256),
 * and the relay service verifies them with the JSON Web Key Set of the app.
 * Thus the app and the relay service share no secret.
 *
 * - `iss`: the base URL of the app without the trailing slash (`urls.issuer`
 *   of the application context).
 * - `aud`: `RELAY_INTERNAL_REQUEST_TOKEN_AUDIENCE`. The connection tokens of
 *   the runtimes have a different audience
 *   (`RUNTIME_CONNECTION_TOKEN_AUDIENCE` of `application`), thus one token
 *   kind never works as the other one.
 * - `operation` and its target (`user_id`): a token is valid only for one
 *   endpoint and one target. The requests have no body.
 * - `iat` and `exp`: a lifetime of `TOKEN_LIFETIME_SECONDS`.
 */

const RELAY_INTERNAL_REQUEST_TOKEN_AUDIENCE = "sam_relay_internal";

export enum RelayInternalOperation {
  /** Closes all runtime connections of a user, after a ban */
  DisconnectUser = "disconnect_user",
}

/** The path of each internal endpoint of the relay service */
export const RELAY_INTERNAL_PATHS = {
  [RelayInternalOperation.DisconnectUser]: "/internal/disconnect-user",
} as const satisfies Record<RelayInternalOperation, string>;

export interface RelayInternalRequest {
  readonly operation: RelayInternalOperation.DisconnectUser;
  readonly userId: string;
}

/** The app sends the request at once after it signs the token */
const TOKEN_LIFETIME_SECONDS = 60;

const toClaims = ({ operation, userId }: RelayInternalRequest) => ({
  operation,
  user_id: userId,
});

/** Never log the token */
export const signRelayInternalRequestToken = ({
  signingKey,
  issuer,
  request,
}: {
  readonly signingKey: SigningKey;
  readonly issuer: string;
  readonly request: RelayInternalRequest;
}): Promise<string> =>
  new SignJWT(toClaims(request))
    .setProtectedHeader({ alg: signingKey.algorithm, kid: signingKey.keyId })
    .setIssuer(issuer)
    .setAudience(RELAY_INTERNAL_REQUEST_TOKEN_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_LIFETIME_SECONDS}s`)
    .sign(signingKey.privateKey);

const claimsSchema = z.object({
  operation: z.enum(RelayInternalOperation),
  user_id: z.string().min(1),
});

/** The token of an internal request is not valid. The endpoint answers 401. */
export class RelayInternalRequestTokenError extends Error {
  override readonly name = "RelayInternalRequestTokenError";

  constructor(
    message = "The token of the internal request is not valid",
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

/**
 * The check of an internal endpoint of the relay service: it verifies the
 * signature, the algorithm, the issuer, the audience, the expiry and the
 * operation of the token.
 *
 * @throws RelayInternalRequestTokenError when the token is not valid or is for
 * a different operation. The endpoint answers 401.
 * @throws KeySetUnavailableError when the key set of the app cannot be read.
 * The endpoint answers 503.
 */
export const verifyRelayInternalRequestToken = async ({
  token,
  key,
  issuer,
  operation,
}: {
  readonly token: string;
  /** The relay service gives `createRemoteJWKSet()` of the key set of the app */
  readonly key: JWTVerifyGetKey;
  readonly issuer: string;
  /** The operation of the endpoint */
  readonly operation: RelayInternalOperation;
}): Promise<RelayInternalRequest> => {
  let payload;
  try {
    ({ payload } = await jwtVerify(token, key, {
      issuer,
      audience: RELAY_INTERNAL_REQUEST_TOKEN_AUDIENCE,
      algorithms: [SIGNING_KEY_ALGORITHM],
      requiredClaims: ["iat", "exp"],
    }));
  } catch (error) {
    if (isKeySetFetchError(error))
      throw new KeySetUnavailableError(undefined, { cause: error });

    if (error instanceof errors.JOSEError)
      throw new RelayInternalRequestTokenError(undefined, { cause: error });

    throw error;
  }

  const claims = claimsSchema.safeParse(payload);
  if (!claims.success || claims.data.operation !== operation)
    throw new RelayInternalRequestTokenError();

  return { operation: claims.data.operation, userId: claims.data.user_id };
};
