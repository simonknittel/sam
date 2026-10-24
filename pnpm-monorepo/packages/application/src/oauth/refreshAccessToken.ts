import * as z from "zod";
import type { ApplicationContext } from "../context.js";
import { canUseMcp } from "../mcpAccess.js";
import { withSpan } from "../withSpan.js";
import { requireSigningKey } from "./accessToken.js";
import {
  MAX_OPAQUE_TOKEN_LENGTH,
  MAX_URL_LENGTH,
  SUPPORTED_SCOPES,
} from "./constants.js";
import { OAuthTokenError, OAuthTokenErrorCode } from "./errors.js";
import { createGrantActor, GRANT_ACTOR_SELECT } from "./grantActor.js";
import { isMcpResource } from "./resource.js";
import { revokeGrant } from "./revokeGrant.js";
import { hashOpaqueToken } from "./secrets.js";
import {
  createRefreshToken,
  createTokenResponse,
  type TokenResponse,
} from "./tokenResponse.js";

/** The form fields of a token request with a refresh token */
export const refreshAccessTokenInputSchema = z.object({
  grant_type: z.literal("refresh_token"),
  refresh_token: z.string().min(1).max(MAX_OPAQUE_TOKEN_LENGTH),
  client_id: z.string().min(1).max(MAX_URL_LENGTH),
  resource: z.string().min(1).max(MAX_URL_LENGTH).optional(),
  scope: z.string().max(1000).optional(),
});

const invalidGrant = (description: string) =>
  new OAuthTokenError(OAuthTokenErrorCode.InvalidGrant, description);

/** A parallel request used the refresh token first */
class RefreshTokenReuseError extends Error {
  override readonly name = "RefreshTokenReuseError";
}

/**
 * The token request with a refresh token (RFC 6749 section 6). Each refresh
 * token is valid for one request and gets a successor (rotation). A used
 * refresh token that comes again was possibly stolen: then the grant and all
 * its tokens become invalid.
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
        expiresAt: true,
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

    if (refreshToken.usedAt) throw await revokeReusedGrant();

    if (refreshToken.expiresAt <= now || grant.revokedAt || grant.user.bannedAt)
      throw invalidGrant("The refresh token is not valid");

    if (grant.clientId !== input.client_id)
      throw invalidGrant("The refresh token belongs to a different client");

    /**
     * The user lost the clearance or the permission after the consent. The
     * token stays unused: a role or the email confirmation can give the
     * access back.
     */
    const actor = await createGrantActor(context, grant);
    if (!actor.hasClearance() || !canUseMcp(actor))
      throw invalidGrant("The user cannot use the MCP server");

    if (input.resource !== undefined && !isMcpResource(context, input.resource))
      throw new OAuthTokenError(
        OAuthTokenErrorCode.InvalidTarget,
        "The resource is not the MCP server of this authorization server",
      );

    // The grant has the scope `mcp`; `offline_access` has no effect
    const requestedScopes = input.scope?.split(" ").filter(Boolean) ?? [];
    if (requestedScopes.some((scope) => !SUPPORTED_SCOPES.includes(scope)))
      throw new OAuthTokenError(
        OAuthTokenErrorCode.InvalidScope,
        "The scope is larger than the scope of the grant",
      );

    const successor = createRefreshToken(context, grant.id);
    try {
      await context.prisma.$transaction(async (transaction) => {
        const { id: successorId } = await transaction.oAuthRefreshToken.create({
          data: successor.data,
          select: { id: true },
        });

        const { count } = await transaction.oAuthRefreshToken.updateMany({
          where: { id: refreshToken.id, usedAt: null },
          data: { usedAt: now, replacedById: successorId },
        });
        // Undoes the successor
        if (count === 0) throw new RefreshTokenReuseError();

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
