import { getApplicationContext } from "@/modules/application";
import { isMcpServerDisabled } from "@/modules/oauth/utils/isMcpServerDisabled";
import {
  corsPreflightResponse,
  temporarilyUnavailableResponse,
  tokenEndpointResponse,
} from "@/modules/oauth/utils/responses";
import {
  parseTokenEndpointInput,
  readTokenEndpointForm,
  toTokenEndpointErrorResponse,
} from "@/modules/oauth/utils/tokenEndpoint";
import {
  OAuthTokenError,
  OAuthTokenErrorCode,
  redeemAuthorizationCode,
  redeemAuthorizationCodeInputSchema,
  refreshAccessToken,
  refreshAccessTokenInputSchema,
} from "@sam-monorepo/application";

const handleTokenRequest = (fields: Record<string, string>) => {
  const context = getApplicationContext();

  switch (fields.grant_type) {
    case "authorization_code":
      return redeemAuthorizationCode(
        context,
        parseTokenEndpointInput(redeemAuthorizationCodeInputSchema, fields),
      );

    case "refresh_token":
      return refreshAccessToken(
        context,
        parseTokenEndpointInput(refreshAccessTokenInputSchema, fields),
      );

    case undefined:
      throw new OAuthTokenError(
        OAuthTokenErrorCode.InvalidRequest,
        "The grant_type parameter is missing",
      );

    default:
      throw new OAuthTokenError(
        OAuthTokenErrorCode.UnsupportedGrantType,
        "The supported grant types are authorization_code and refresh_token",
      );
  }
};

/**
 * RFC 6749 section 3.2. Public by design: the clients are public clients, PKCE
 * and the single-use codes and refresh tokens protect it.
 */
export const POST = async (request: Request) => {
  if (await isMcpServerDisabled()) return temporarilyUnavailableResponse();

  try {
    return tokenEndpointResponse(
      await handleTokenRequest(await readTokenEndpointForm(request)),
    );
  } catch (error) {
    return toTokenEndpointErrorResponse(error, "token");
  }
};

export const OPTIONS = () =>
  corsPreflightResponse("POST, OPTIONS", "Content-Type");
