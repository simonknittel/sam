import { protectedResourceMetadataResponse } from "@/modules/oauth/utils/protectedResourceMetadata";
import { corsPreflightResponse } from "@/modules/oauth/utils/responses";
import { OAuthResource } from "@sam-monorepo/application";

/**
 * RFC 9728: the MCP server, for clients that look only at the root. The path
 * with the resource gives the same document.
 */
export const GET = () => protectedResourceMetadataResponse(OAuthResource.Mcp);

export const OPTIONS = () => corsPreflightResponse("GET, OPTIONS", "*");
