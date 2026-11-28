import { errors, jwtVerify, SignJWT } from "jose";
import { createPublicKey, randomBytes } from "node:crypto";
import * as z from "zod";
import type { ApplicationContext } from "../context.js";
import { ACCESS_TOKEN_LIFETIME_IN_SECONDS } from "./constants.js";
import { InvalidTokenError, SigningKeyUnavailableError } from "./errors.js";
import {
  getOAuthResourceOfClient,
  getOAuthResourceUrl,
  type OAuthResource,
} from "./resources.js";

/** The media type of a JWT access token (RFC 9068 section 2.1) */
const ACCESS_TOKEN_TYPE = "at+jwt";

const ALGORITHM = "ES256";

/** 128 random bits make each `jti` unique (RFC 7519 section 4.1.7) */
const TOKEN_ID_BYTES = 16;

/**
 * Gives the signing key of the host
 *
 * @param createError Makes the error for a host without a key. The default
 * is the error of the OAuth endpoints.
 * @throws SigningKeyUnavailableError or the error of `createError` when the
 * host has no signing key
 */
export const requireSigningKey = async (
  context: Pick<ApplicationContext, "signingKey">,
  createError: () => Error = () => new SigningKeyUnavailableError(),
) => {
  const signingKey = await context.signingKey();
  if (!signingKey) throw createError();

  return signingKey;
};

export interface AccessTokenGrant {
  /**
   * The private claim `grant_id`: the MCP endpoint and the connection token
   * route load the grant with it
   */
  readonly id: string;
  readonly userId: string;
  /** Selects the resource, thus the audience of the token */
  readonly clientId: string;
  readonly scope: string;
}

/** Never log the token */
export const issueAccessToken = async (
  context: Pick<ApplicationContext, "signingKey" | "urls" | "now">,
  grant: AccessTokenGrant,
) => {
  const signingKey = await requireSigningKey(context);
  const issuedAt = Math.floor(context.now().getTime() / 1000);

  return new SignJWT({
    client_id: grant.clientId,
    scope: grant.scope,
    grant_id: grant.id,
  })
    .setProtectedHeader({
      alg: ALGORITHM,
      kid: signingKey.keyId,
      typ: ACCESS_TOKEN_TYPE,
    })
    .setIssuer(context.urls.issuer)
    .setAudience(
      getOAuthResourceUrl(
        context,
        getOAuthResourceOfClient(context, grant.clientId),
      ).href,
    )
    .setSubject(grant.userId)
    .setJti(randomBytes(TOKEN_ID_BYTES).toString("base64url"))
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + ACCESS_TOKEN_LIFETIME_IN_SECONDS)
    .sign(signingKey.privateKey);
};

/** The claims that the app sets; `jwtVerify()` checks the other claims */
const accessTokenClaimsSchema = z.object({
  sub: z.string().min(1),
  grant_id: z.string().min(1),
  client_id: z.string().min(1),
  scope: z.string(),
  exp: z.number(),
});

export interface VerifiedAccessToken {
  readonly userId: string;
  readonly grantId: string;
  readonly clientId: string;
  readonly scopes: string[];
  /** Seconds since the epoch, like `exp` and the `AuthInfo` of the MCP SDK */
  readonly expiresAt: number;
  /** The audience */
  readonly resource: URL;
  readonly oauthResource: OAuthResource;
}

/**
 * Does not load the grant: `resolvePrincipal()` checks the revocation. A
 * token of a different resource is not valid.
 *
 * @throws InvalidTokenError when the token is not valid
 * @throws SigningKeyUnavailableError when the app has no signing key
 */
export const verifyAccessToken = async (
  context: Pick<ApplicationContext, "signingKey" | "urls" | "now">,
  token: string,
  oauthResource: OAuthResource,
): Promise<VerifiedAccessToken> => {
  const signingKey = await requireSigningKey(context);
  const resource = getOAuthResourceUrl(context, oauthResource);

  let payload;
  try {
    ({ payload } = await jwtVerify(
      token,
      createPublicKey(signingKey.privateKey),
      {
        issuer: context.urls.issuer,
        audience: resource.href,
        algorithms: [ALGORITHM],
        typ: ACCESS_TOKEN_TYPE,
        currentDate: context.now(),
        requiredClaims: ["sub", "jti", "exp", "iat"],
      },
    ));
  } catch (error) {
    if (error instanceof errors.JOSEError)
      throw new InvalidTokenError(error.message, { cause: error });

    throw error;
  }

  const claims = accessTokenClaimsSchema.safeParse(payload);
  if (!claims.success)
    throw new InvalidTokenError("The access token has invalid claims");

  return {
    userId: claims.data.sub,
    grantId: claims.data.grant_id,
    clientId: claims.data.client_id,
    scopes: claims.data.scope.split(" ").filter(Boolean),
    expiresAt: claims.data.exp,
    // `jwtVerify()` checked that the audience is this URL
    resource: new URL(resource),
    oauthResource,
  };
};
