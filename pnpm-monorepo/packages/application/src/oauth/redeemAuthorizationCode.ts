import * as z from "zod";
import type { ApplicationContext } from "../context.js";
import { canUseMcp } from "../mcpAccess.js";
import { withSpan } from "../withSpan.js";
import { requireSigningKey } from "./accessToken.js";
import {
  MAX_OPAQUE_TOKEN_LENGTH,
  MAX_URL_LENGTH,
  PKCE_VALUE,
} from "./constants.js";
import { OAuthTokenError, OAuthTokenErrorCode } from "./errors.js";
import { createGrantActor, GRANT_ACTOR_SELECT } from "./grantActor.js";
import { isMcpResource } from "./resource.js";
import { revokeGrant } from "./revokeGrant.js";
import { hashOpaqueToken, verifyCodeVerifier } from "./secrets.js";
import {
  createRefreshToken,
  createTokenResponse,
  type TokenResponse,
} from "./tokenResponse.js";

/** The form fields of a token request with an authorization code */
export const redeemAuthorizationCodeInputSchema = z.object({
  grant_type: z.literal("authorization_code"),
  code: z.string().min(1).max(MAX_OPAQUE_TOKEN_LENGTH),
  redirect_uri: z.string().min(1).max(MAX_URL_LENGTH),
  client_id: z.string().min(1).max(MAX_URL_LENGTH),
  code_verifier: z.string().regex(PKCE_VALUE),
  resource: z.string().min(1).max(MAX_URL_LENGTH).optional(),
});

const invalidGrant = (description: string) =>
  new OAuthTokenError(OAuthTokenErrorCode.InvalidGrant, description);

/**
 * A used code that comes again was possibly stolen. Thus the grant of the
 * code and all its tokens become invalid (RFC 6749 section 4.1.2).
 */
const revokeGrantOfReusedCode = async (
  context: ApplicationContext,
  codeHash: string,
) => {
  const code = await context.prisma.oAuthAuthorizationCode.findUnique({
    where: { codeHash },
    select: { usedAt: true, grant: { select: { id: true, clientId: true } } },
  });
  if (!code?.usedAt) return;

  context.log.warn("Reuse of an authorization code", {
    grantId: code.grant.id,
  });

  await revokeGrant(context, {
    grantId: code.grant.id,
    clientId: code.grant.clientId,
    revokedById: null,
    auditCreatedById: null,
  });
};

/**
 * The token request with an authorization code (RFC 6749 section 4.1.3,
 * RFC 7636 section 4.5). The code is valid for one request: it is marked as
 * used before the checks, thus a failed check also uses it up.
 */
export const redeemAuthorizationCode = (
  context: ApplicationContext,
  input: z.infer<typeof redeemAuthorizationCodeInputSchema>,
): Promise<TokenResponse> =>
  withSpan(context, "redeemAuthorizationCode", async () => {
    // Before the code is used up: without a key, the client can try again
    await requireSigningKey(context);

    const codeHash = hashOpaqueToken(input.code);
    const now = context.now();

    // One conditional update, thus two parallel requests cannot both use
    // the code
    const { count } = await context.prisma.oAuthAuthorizationCode.updateMany({
      where: { codeHash, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (count === 0) {
      await revokeGrantOfReusedCode(context, codeHash);
      throw invalidGrant("The authorization code is not valid");
    }

    const code = await context.prisma.oAuthAuthorizationCode.findUniqueOrThrow({
      where: { codeHash },
      select: {
        clientId: true,
        redirectUri: true,
        codeChallenge: true,
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

    if (code.clientId !== input.client_id)
      throw invalidGrant(
        "The authorization code belongs to a different client",
      );

    if (code.redirectUri !== input.redirect_uri)
      throw invalidGrant(
        "The redirect_uri is not the redirect_uri of the authorization request",
      );

    if (!verifyCodeVerifier(input.code_verifier, code.codeChallenge))
      throw invalidGrant("The code_verifier does not match the code_challenge");

    if (input.resource !== undefined && !isMcpResource(context, input.resource))
      throw new OAuthTokenError(
        OAuthTokenErrorCode.InvalidTarget,
        "The resource is not the MCP server of this authorization server",
      );

    const { grant } = code;
    if (grant.revokedAt || grant.user.bannedAt)
      throw invalidGrant("The grant is revoked");

    // The user lost the clearance or the permission after the consent
    const actor = await createGrantActor(context, grant);
    if (!actor.hasClearance() || !canUseMcp(actor))
      throw invalidGrant("The user cannot use the MCP server");

    const refreshToken = createRefreshToken(context, grant.id);
    await context.prisma.oAuthRefreshToken.create({
      data: refreshToken.data,
      select: { id: true },
    });

    return createTokenResponse(context, grant, refreshToken.token);
  });
