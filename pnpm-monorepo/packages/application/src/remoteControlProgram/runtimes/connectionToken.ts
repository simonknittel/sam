import { RELAY_LIMITS, runtimeIdSchema } from "@sam-monorepo/domain";
import { errors, jwtVerify, SignJWT, type JWTVerifyGetKey } from "jose";
import { createPublicKey } from "node:crypto";
import * as z from "zod";
import {
  SIGNING_KEY_ALGORITHM,
  type ApplicationContext,
} from "../../context.js";
import { ConflictError, ForbiddenError } from "../../errors.js";
import { requireSigningKey } from "../../oauth/accessToken.js";
import { RemoteControlProgramErrorMessage } from "../access/remoteControlProgramErrors.js";
import { isKeySetFetchError, KeySetUnavailableError } from "./keySetErrors.js";

/**
 * The connection token of a runtime: an ES256 token of the app (see "Connection
 * and tokens" of `docs/remote-control-program/README.md`). The app signs it
 * with its signing key, and the relay service verifies it with the JSON Web
 * Key Set of the app.
 *
 * - `iss`: the base URL of the app without the trailing slash
 *   (`context.urls.issuer`), thus the relay service builds the URLs of its
 *   context with the base URL of the app.
 * - `aud`: `RUNTIME_CONNECTION_TOKEN_AUDIENCE`.
 * - `sub`: the id of the user.
 * - `citizen_id`: the citizen of the user, the owner of the runtime.
 * - `runtime_id`: the id that the runtime sends in its `hello`.
 * - `admin_mode`: whether admin mode was on for the actor of the app. The
 *   relay service checks the admin role again.
 * - `iat` and `exp`: the lifetime is
 *   `RELAY_LIMITS.connectionTokenLifetimeMilliseconds`.
 */

/**
 * Only the relay service accepts this audience. The internal requests of the
 * app to the relay service have a different audience (see the relay client
 * of `infrastructure`), thus one token kind never works as the other one.
 */
export const RUNTIME_CONNECTION_TOKEN_AUDIENCE = "sam_relay_connection";

const MILLISECONDS_PER_SECOND = 1_000;

const createKeyNotConfiguredError = () =>
  new ConflictError(RemoteControlProgramErrorMessage.TokenKeyNotConfigured);

export interface RuntimeConnectionTokenClaims {
  readonly userId: string;
  readonly citizenId: string;
  readonly runtimeId: string;
  readonly adminMode: boolean;
}

export interface SignedRuntimeConnectionToken {
  readonly token: string;
  readonly expiresAt: Date;
}

/**
 * Never log the token.
 *
 * @throws ConflictError when the host has no signing key
 * (`RemoteControlProgramErrorMessage.TokenKeyNotConfigured`)
 */
export const signRuntimeConnectionToken = async (
  context: Pick<ApplicationContext, "signingKey" | "urls" | "now">,
  { userId, citizenId, runtimeId, adminMode }: RuntimeConnectionTokenClaims,
): Promise<SignedRuntimeConnectionToken> => {
  const signingKey = await requireSigningKey(
    context,
    createKeyNotConfiguredError,
  );

  const issuedAtSeconds = Math.floor(
    context.now().getTime() / MILLISECONDS_PER_SECOND,
  );
  const expiresAtSeconds =
    issuedAtSeconds +
    RELAY_LIMITS.connectionTokenLifetimeMilliseconds / MILLISECONDS_PER_SECOND;

  const token = await new SignJWT({
    citizen_id: citizenId,
    runtime_id: runtimeId,
    admin_mode: adminMode,
  })
    .setProtectedHeader({ alg: signingKey.algorithm, kid: signingKey.keyId })
    .setIssuer(context.urls.issuer)
    .setAudience(RUNTIME_CONNECTION_TOKEN_AUDIENCE)
    .setSubject(userId)
    .setIssuedAt(issuedAtSeconds)
    .setExpirationTime(expiresAtSeconds)
    .sign(signingKey.privateKey);

  return {
    token,
    expiresAt: new Date(expiresAtSeconds * MILLISECONDS_PER_SECOND),
  };
};

/** The claims that the app sets. `jwtVerify()` checks the other claims. */
const connectionTokenClaimsSchema = z.object({
  sub: z.string().min(1),
  citizen_id: z.string().min(1),
  runtime_id: runtimeIdSchema,
  admin_mode: z.boolean(),
  exp: z.number(),
});

export interface VerifiedRuntimeConnectionToken extends RuntimeConnectionTokenClaims {
  readonly expiresAt: Date;
}

const getVerificationKey = async (
  context: Pick<
    ApplicationContext,
    "connectionTokenVerificationKey" | "signingKey"
  >,
): Promise<JWTVerifyGetKey> => {
  if (context.connectionTokenVerificationKey)
    return context.connectionTokenVerificationKey;

  const signingKey = await requireSigningKey(
    context,
    createKeyNotConfiguredError,
  );
  const publicKey = createPublicKey(signingKey.privateKey);
  return async () => publicKey;
};

/**
 * Verifies the signature, the algorithm, the issuer, the audience, the
 * expiry and the claims of a connection token. It reads no database.
 *
 * @throws ForbiddenError when the token is not valid
 * (`RemoteControlProgramErrorMessage.ConnectionTokenNotValid`)
 * @throws ConflictError when the host has no key to verify the token
 * @throws KeySetUnavailableError when the key set of the app cannot be read
 */
export const verifyRuntimeConnectionToken = async (
  context: Pick<
    ApplicationContext,
    "connectionTokenVerificationKey" | "signingKey" | "urls" | "now"
  >,
  token: string,
): Promise<VerifiedRuntimeConnectionToken> => {
  const key = await getVerificationKey(context);

  let payload;
  try {
    ({ payload } = await jwtVerify(token, key, {
      issuer: context.urls.issuer,
      audience: RUNTIME_CONNECTION_TOKEN_AUDIENCE,
      algorithms: [SIGNING_KEY_ALGORITHM],
      currentDate: context.now(),
      requiredClaims: ["sub", "iat", "exp"],
    }));
  } catch (error) {
    if (isKeySetFetchError(error))
      throw new KeySetUnavailableError(undefined, { cause: error });

    if (error instanceof errors.JOSEError)
      throw new ForbiddenError(
        RemoteControlProgramErrorMessage.ConnectionTokenNotValid,
        { cause: error },
      );

    throw error;
  }

  const claims = connectionTokenClaimsSchema.safeParse(payload);
  if (!claims.success)
    throw new ForbiddenError(
      RemoteControlProgramErrorMessage.ConnectionTokenNotValid,
    );

  return {
    userId: claims.data.sub,
    citizenId: claims.data.citizen_id,
    runtimeId: claims.data.runtime_id,
    adminMode: claims.data.admin_mode,
    expiresAt: new Date(claims.data.exp * MILLISECONDS_PER_SECOND),
  };
};
