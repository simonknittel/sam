import { getApplicationContext } from "@/modules/application";
import { isMcpServerDisabled } from "@/modules/oauth/utils/isMcpServerDisabled";
import {
  corsPreflightResponse,
  metadataResponse,
  temporarilyUnavailableResponse,
} from "@/modules/oauth/utils/responses";
import { getProtectedResourceMetadata } from "@sam-monorepo/application";

/**
 * The protected resource metadata (RFC 9728) of the MCP server. The path
 * with the resource (`/api/mcp`) gives the same document; this path is for
 * clients that look only at the root. Public by design: the clients read it
 * before they have a token. It gives no data of a user.
 */
export const GET = async () => {
  if (await isMcpServerDisabled()) return temporarilyUnavailableResponse();

  return metadataResponse(
    getProtectedResourceMetadata(getApplicationContext()),
  );
};

export const OPTIONS = () => corsPreflightResponse("GET, OPTIONS", "*");
