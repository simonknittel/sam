import type { OAuthRefreshToken } from "@sam-monorepo/database/client";
import * as z from "zod";
import type { ApplicationContext } from "../context.js";
import { withSpan } from "../withSpan.js";
import { requireSigningKey } from "./accessToken.js";
import {
  MAX_OPAQUE_TOKEN_LENGTH,
  MAX_URL_LENGTH,
  REFRESH_TOKEN_GRACE_TIME_IN_MILLISECONDS,
  SUPPORTED_SCOPES,
} from "./constants.js";
import { OAuthTokenError, OAuthTokenErrorCode } from "./errors.js";
import { createGrantActor, GRANT_ACTOR_SELECT } from "./grantActor.js";
import {
  canUseOAuthResource,
  findOAuthResource,
  getOAuthResourceOfClient,
} from "./resources.js";
import { revokeGrant } from "./revokeGrant.js";
import { hashOpaqueToken } from "./secrets.js";
import {
  createRefreshToken,
  createTokenResponse,
  type TokenResponse,
} from "./tokenResponse.js";

export const refreshAccessTokenInputSchema = z.object({
  grant_type: z.literal("refresh_token"),
  refresh_token: z.string().min(1).max(MAX_OPAQUE_TOKEN_LENGTH),
  client_id: z.string().min(1).max(MAX_URL_LENGTH),
  resource: z.string().min(1).max(MAX_URL_LENGTH).optional(),
  scope: z.string().max(1000).optional(),
});

const invalidGrant = (description: string) =>
  new OAuthTokenError(OAuthTokenErrorCode.InvalidGrant, description);

/** A parallel request used the refresh token or its replacement first */
class RefreshTokenReuseError extends Error {
  override readonly name = "RefreshTokenReuseError";
}

type UsedRefreshToken = Pick<OAuthRefreshToken, "usedAt" | "usedAgainAt"> & {
  readonly replacedBy: Pick<OAuthRefreshToken, "id" | "usedAt"> | null;
};

/**
 * The replacement that the client did not get: the token was used within
 * the grace time, it was not used again, and nobody used its replacement.
 * Null for each other used token.
 */
const findLostReplacementId = (
  { usedAt, usedAgainAt, replacedBy }: UsedRefreshToken,
  now: Date,
) => {
  if (!usedAt || usedAgainAt || !replacedBy || replacedBy.usedAt) return null;

  if (
    now.getTime() - usedAt.getTime() >
    REFRESH_TOKEN_GRACE_TIME_IN_MILLISECONDS
  )
    return null;

  return replacedBy.id;
};

/**
 * The token request with a refresh token (RFC 6749 section 6). Each refresh
 * token is valid for one request and gets a successor (rotation). A used
 * refresh token that comes again was possibly stolen: then the grant and all
 * its tokens become invalid.
 *
 * Exception: a client that did not get the answer of a refresh (for example
 * after a lost network connection or a quit) sends the used token again. The
 * used token works once more within `REFRESH_TOKEN_GRACE_TIME_IN_MILLISECONDS`
 * when nobody used its replacement. The lost replacement then becomes used
 * without a successor, thus its later use revokes the grant.
 */
export const refreshAccessToken = (
  context: ApplicationContext,
  input: z.infer<typeof refreshAccessTokenInputSchema>,
): Promise<TokenResponse> =>
  withSpan(context, "refreshAccessToken", async () => {
    // Before the token is used up: without a key, the client can try again
    await requireSigningKey(context);

    const now = context.now();

    const refreshToken = await context.prisma.oAuthRefreshToken.findUnique({
      where: { tokenHash: hashOpaqueToken(input.refresh_token) },
      select: {
        id: true,
        usedAt: true,
        usedAgainAt: true,
        expiresAt: true,
        replacedBy: { select: { id: true, usedAt: true } },
        grant: {
          select: {
            ...GRANT_ACTOR_SELECT,
            id: true,
            clientId: true,
            scope: true,
            revokedAt: true,
          },
        },
      },
    });
    if (!refreshToken) throw invalidGrant("The refresh token is not valid");

    const { grant } = refreshToken;
    const revokeReusedGrant = async () => {
      context.log.warn("Reuse of a refresh token", { grantId: grant.id });

      await revokeGrant(context, {
        grantId: grant.id,
        clientId: grant.clientId,
        revokedById: null,
        auditCreatedById: null,
      });

      return invalidGrant("The refresh token is not valid");
    };

    const lostReplacementId = findLostReplacementId(refreshToken, now);
    if (refreshToken.usedAt && !lostReplacementId)
      throw await revokeReusedGrant();

    if (refreshToken.expiresAt <= now || grant.revokedAt || grant.user.bannedAt)
      throw invalidGrant("The refresh token is not valid");

    if (grant.clientId !== input.client_id)
      throw invalidGrant("The refresh token belongs to a different client");

    /**
     * The user lost the clearance or the permission after the consent. The
     * token stays unused: a role or the email confirmation can give the
     * access back.
     */
    const oauthResource = getOAuthResourceOfClient(context, grant.clientId);
    const actor = await createGrantActor(context, grant);
    if (!actor.hasClearance() || !canUseOAuthResource(actor, oauthResource))
      throw invalidGrant("The user cannot use the resource");

    // A refresh keeps the resource of the grant
    if (
      input.resource !== undefined &&
      findOAuthResource(context, input.resource) !== oauthResource
    )
      throw new OAuthTokenError(
        OAuthTokenErrorCode.InvalidTarget,
        "The resource is not the resource of the grant",
      );

    /**
     * The token keeps the one scope of the grant. Like at the authorization,
     * the scope of the other resource and `offline_access` have no effect
     * (RFC 6749 section 3.3).
     */
    const requestedScopes = input.scope?.split(" ").filter(Boolean) ?? [];
    if (requestedScopes.some((scope) => !SUPPORTED_SCOPES.includes(scope)))
      throw new OAuthTokenError(
        OAuthTokenErrorCode.InvalidScope,
        "The scope is not a scope of this authorization server",
      );

    const successor = createRefreshToken(context, grant.id);
    try {
      await context.prisma.$transaction(async (transaction) => {
        const { id: successorId } = await transaction.oAuthRefreshToken.create({
          data: successor.data,
          select: { id: true },
        });

        /**
         * The conditional updates make a parallel request with the same token
         * or with the replacement wait, and then find no row. Then it undoes
         * its successor.
         */
        if (lostReplacementId) {
          const { count } = await transaction.oAuthRefreshToken.updateMany({
            where: {
              id: refreshToken.id,
              usedAgainAt: null,
              replacedById: lostReplacementId,
            },
            data: { usedAgainAt: now, replacedById: successorId },
          });
          if (count === 0) throw new RefreshTokenReuseError();

          const { count: lostReplacementCount } =
            await transaction.oAuthRefreshToken.updateMany({
              where: { id: lostReplacementId, usedAt: null },
              data: { usedAt: now },
            });
          if (lostReplacementCount === 0) throw new RefreshTokenReuseError();
        } else {
          const { count } = await transaction.oAuthRefreshToken.updateMany({
            where: { id: refreshToken.id, usedAt: null },
            data: { usedAt: now, replacedById: successorId },
          });
          if (count === 0) throw new RefreshTokenReuseError();
        }

        await transaction.oAuthGrant.update({
          where: { id: grant.id },
          data: { lastUsedAt: now },
          select: { id: true },
        });
      });
    } catch (error) {
      if (error instanceof RefreshTokenReuseError)
        throw await revokeReusedGrant();

      throw error;
    }

    return createTokenResponse(context, grant, successor.token);
  });
