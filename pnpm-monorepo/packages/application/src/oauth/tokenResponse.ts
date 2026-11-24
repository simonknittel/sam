import type { ApplicationContext } from "../context.js";
import { issueAccessToken, type AccessTokenGrant } from "./accessToken.js";
import {
  ACCESS_TOKEN_LIFETIME_IN_SECONDS,
  REFRESH_TOKEN_LIFETIME_IN_MILLISECONDS,
} from "./constants.js";
import { createOpaqueToken, hashOpaqueToken } from "./secrets.js";

/** The successful response of the token endpoint (RFC 6749 section 5.1) */
export interface TokenResponse {
  readonly access_token: string;
  readonly token_type: "Bearer";
  readonly expires_in: number;
  readonly refresh_token: string;
  readonly scope: string;
}

/**
 * The caller stores `data` in the same transaction as the other changes of the
 * grant
 */
export const createRefreshToken = (
  context: Pick<ApplicationContext, "now">,
  grantId: string,
) => {
  const token = createOpaqueToken();

  return {
    token,
    data: {
      grantId,
      tokenHash: hashOpaqueToken(token),
      expiresAt: new Date(
        context.now().getTime() + REFRESH_TOKEN_LIFETIME_IN_MILLISECONDS,
      ),
    },
  };
};

export const createTokenResponse = async (
  context: Pick<ApplicationContext, "signingKey" | "urls" | "now">,
  grant: AccessTokenGrant,
  refreshToken: string,
): Promise<TokenResponse> => ({
  access_token: await issueAccessToken(context, grant),
  token_type: "Bearer",
  expires_in: ACCESS_TOKEN_LIFETIME_IN_SECONDS,
  refresh_token: refreshToken,
  scope: grant.scope,
});
