import type { ApplicationContext } from "../context.js";
import {
  getOAuthResourceScope,
  getOAuthResourceUrl,
  OAuthResource,
} from "./resources.js";

type MetadataContext = Pick<ApplicationContext, "urls">;

/** The authorization server metadata (RFC 8414) of both resources */
export const getAuthorizationServerMetadata = (context: MetadataContext) => {
  const { urls } = context;

  return {
    issuer: urls.issuer,
    authorization_endpoint: new URL("/app/oauth/authorize", urls.baseUrl).href,
    token_endpoint: new URL("/api/oauth/token", urls.baseUrl).href,
    revocation_endpoint: new URL("/api/oauth/revoke", urls.baseUrl).href,
    jwks_uri: new URL("/.well-known/jwks.json", urls.baseUrl).href,
    scopes_supported: Object.values(OAuthResource).map(getOAuthResourceScope),
    response_types_supported: ["code"],
    response_modes_supported: ["query"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    token_endpoint_auth_methods_supported: ["none"],
    revocation_endpoint_auth_methods_supported: ["none"],
    code_challenge_methods_supported: ["S256"],
    // draft-ietf-oauth-client-id-metadata-document
    client_id_metadata_document_supported: true,
    // RFC 9207
    authorization_response_iss_parameter_supported: true,
  };
};

/** The protected resource metadata of one resource (RFC 9728) */
export const getProtectedResourceMetadata = (
  context: MetadataContext,
  resource: OAuthResource,
) => ({
  resource: getOAuthResourceUrl(context, resource).href,
  authorization_servers: [context.urls.issuer],
  scopes_supported: [getOAuthResourceScope(resource)],
  bearer_methods_supported: ["header"],
});
