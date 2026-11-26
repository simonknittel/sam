import * as z from "zod";
import type { ApplicationContext } from "../context.js";
import { withSpan } from "../withSpan.js";
import { verifyAccessToken } from "./accessToken.js";
import { MAX_URL_LENGTH } from "./constants.js";
import { InvalidTokenError, SigningKeyUnavailableError } from "./errors.js";
import { OAuthResource } from "./resources.js";
import { revokeGrant } from "./revokeGrant.js";
import { hashOpaqueToken } from "./secrets.js";

/** An access token is a JWT of a few hundred characters */
const MAX_TOKEN_LENGTH = 4096;

/** The form fields of a revocation request (RFC 7009 section 2.1) */
export const revokeTokenInputSchema = z.object({
  token: z.string().min(1).max(MAX_TOKEN_LENGTH),
  /** Only a hint: the server finds the type of the token itself */
  token_type_hint: z.string().max(100).optional(),
  client_id: z.string().min(1).max(MAX_URL_LENGTH).optional(),
});

const findGrantOfToken = async (
  context: ApplicationContext,
  token: string,
): Promise<{ id: string; userId: string; clientId: string } | null> => {
  const refreshToken = await context.prisma.oAuthRefreshToken.findUnique({
    where: { tokenHash: hashOpaqueToken(token) },
    select: { grant: { select: { id: true, userId: true, clientId: true } } },
  });
  if (refreshToken) return refreshToken.grant;

  for (const resource of Object.values(OAuthResource))
    try {
      const accessToken = await verifyAccessToken(context, token, resource);

      return {
        id: accessToken.grantId,
        userId: accessToken.userId,
        clientId: accessToken.clientId,
      };
    } catch (error) {
      if (error instanceof SigningKeyUnavailableError) return null;
      if (!(error instanceof InvalidTokenError)) throw error;
    }

  return null;
};

/**
 * Token revocation (RFC 7009): a refresh token or an access token revokes
 * its grant, thus the client is disconnected. The server answers in the
 * same way for an unknown token, an invalid token and a token of a
 * different client (RFC 7009 section 2.2).
 */
export const revokeToken = (
  context: ApplicationContext,
  input: z.infer<typeof revokeTokenInputSchema>,
): Promise<void> =>
  withSpan(context, "revokeToken", async () => {
    const grant = await findGrantOfToken(context, input.token);
    if (!grant) return;

    if (input.client_id !== undefined && input.client_id !== grant.clientId)
      return;

    await revokeGrant(context, {
      grantId: grant.id,
      clientId: grant.clientId,
      // The client revokes the grant for its user
      revokedById: grant.userId,
      auditCreatedById: grant.userId,
    });
  });
