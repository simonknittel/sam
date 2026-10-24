import {
  bearerAuthChallengeResponse,
  getOAuthProtectedResourceMetadataUrl,
  hostHeaderValidationResponse,
  OAuthError,
  OAuthErrorCode,
  requireBearerAuth,
  type AuthInfo,
  type VerifyBearerTokenOptions,
} from "@modelcontextprotocol/server";
import {
  ForbiddenError,
  getProtectedResourceMetadata,
  InvalidTokenError,
  resolvePrincipal,
  verifyAccessToken,
  type ApplicationContext,
  type VerifiedAccessToken,
} from "@sam-monorepo/application";
import {
  createSamMcpHandler,
  toAuthInfoExtra,
  type CreateSamMcpHandlerOptions,
  type McpPrincipalExtra,
} from "./createSamMcpHandler.js";

/** Handles one HTTP request to the MCP endpoint */
export type McpRequestHandler = (
  context: ApplicationContext,
  request: Request,
) => Promise<Response>;

const toAuthInfo = (token: string, verifiedToken: VerifiedAccessToken) => ({
  token,
  clientId: verifiedToken.clientId,
  scopes: verifiedToken.scopes,
  expiresAt: verifiedToken.expiresAt,
  resource: verifiedToken.resource,
});

/**
 * Verifies the bearer token of the request. Gives the verified token, or the
 * `401` or `403` response with the `WWW-Authenticate` challenge.
 */
const authenticate = async (
  context: ApplicationContext,
  request: Request,
  options: Omit<VerifyBearerTokenOptions, "verifier">,
) => {
  // `requireBearerAuth()` gives only the `AuthInfo`, thus the verifier keeps
  // the verified token for the principal
  let verifiedToken: VerifiedAccessToken | undefined;

  const authInfo = await requireBearerAuth({
    ...options,
    verifier: {
      verifyAccessToken: async (token) => {
        try {
          verifiedToken = await verifyAccessToken(context, token);
        } catch (error) {
          if (error instanceof InvalidTokenError)
            throw new OAuthError(OAuthErrorCode.InvalidToken, error.message);

          // For example a missing signing key. The SDK answers `500`, but it
          // does not log the error.
          context.log.error("Failed to verify an MCP access token", { error });
          throw new OAuthError(
            OAuthErrorCode.ServerError,
            "Internal Server Error",
          );
        }

        return toAuthInfo(token, verifiedToken);
      },
    },
  })(request);

  if (authInfo instanceof Response) return authInfo;
  if (!verifiedToken)
    throw new Error("The bearer authentication did not run the verifier");

  return { authInfo, verifiedToken };
};

/**
 * Loads the actor and the disabled tools of the grant of a verified token.
 * Gives the principal, or the response for a revoked grant, a banned user or
 * a user without the clearance of the app.
 */
const loadPrincipal = async (
  context: ApplicationContext,
  verifiedToken: VerifiedAccessToken,
  challengeOptions: Pick<
    VerifyBearerTokenOptions,
    "requiredScopes" | "resourceMetadataUrl"
  >,
): Promise<McpPrincipalExtra | Response> => {
  try {
    const { actor, grant } = await resolvePrincipal(context, verifiedToken);

    return {
      context,
      actor,
      disabledToolNames: grant.disabledToolNames,
    };
  } catch (error) {
    if (error instanceof InvalidTokenError)
      return bearerAuthChallengeResponse(
        new OAuthError(OAuthErrorCode.InvalidToken, error.message),
        challengeOptions,
      );

    // Not `insufficient_scope`: another token does not help the user
    if (error instanceof ForbiddenError)
      return Response.json(
        {
          error: "forbidden",
          error_description: "The user has no access to the app",
        },
        { status: 403 },
      );

    context.log.error("Failed to load the principal of an MCP request", {
      error,
    });
    return Response.json({ error: "server_error" }, { status: 500 });
  }
};

/**
 * Creates the handler of the MCP endpoint for a host, for example a Next.js
 * route. Create it one time. For each request, the handler checks the
 * `Host` header (protection against DNS rebinding), verifies the bearer
 * token, loads the principal and gives the request to the MCP server of the
 * principal. The host adds only its own concerns, for example the kill
 * switch and CORS.
 */
export const createMcpRequestHandler = (
  options: CreateSamMcpHandlerOptions,
): McpRequestHandler => {
  const handler = createSamMcpHandler(options);

  return async (context, request) => {
    const hostResponse = hostHeaderValidationResponse(request, [
      context.urls.baseUrl.hostname,
    ]);
    if (hostResponse) return hostResponse;

    const challengeOptions = {
      // The challenge names the scopes of the metadata document
      requiredScopes: getProtectedResourceMetadata(context).scopes_supported,
      resourceMetadataUrl: getOAuthProtectedResourceMetadataUrl(
        context.urls.mcpResourceUrl,
      ),
    };

    const authentication = await authenticate(context, request, {
      ...challengeOptions,
      expectedResource: context.urls.mcpResourceUrl,
    });
    if (authentication instanceof Response) return authentication;

    const principal = await loadPrincipal(
      context,
      authentication.verifiedToken,
      challengeOptions,
    );
    if (principal instanceof Response) return principal;

    const authInfo: AuthInfo = {
      ...authentication.authInfo,
      extra: toAuthInfoExtra(principal),
    };

    return handler.fetch(request, { authInfo });
  };
};
