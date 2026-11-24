import { getApplicationContext } from "@/modules/application";
import { isMcpServerDisabled } from "@/modules/oauth/utils/isMcpServerDisabled";
import {
  corsPreflightResponse,
  metadataResponse,
  temporarilyUnavailableResponse,
} from "@/modules/oauth/utils/responses";
import { getProtectedResourceMetadata } from "@sam-monorepo/application";

/**
 * RFC 9728. For clients that look only at the root; the path with the resource
 * gives the same document. Public by design: the clients read it before they
 * have a token.
 */
export const GET = async () => {
  if (await isMcpServerDisabled()) return temporarilyUnavailableResponse();

  return metadataResponse(
    getProtectedResourceMetadata(getApplicationContext()),
  );
};

export const OPTIONS = () => corsPreflightResponse("GET, OPTIONS", "*");
