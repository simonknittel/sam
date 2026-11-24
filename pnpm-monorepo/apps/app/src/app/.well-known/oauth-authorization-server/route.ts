import { getApplicationContext } from "@/modules/application";
import { isMcpServerDisabled } from "@/modules/oauth/utils/isMcpServerDisabled";
import {
  corsPreflightResponse,
  metadataResponse,
  temporarilyUnavailableResponse,
} from "@/modules/oauth/utils/responses";
import { getAuthorizationServerMetadata } from "@sam-monorepo/application";

/** RFC 8414. Public by design: the clients read it before they have a token. */
export const GET = async () => {
  if (await isMcpServerDisabled()) return temporarilyUnavailableResponse();

  return metadataResponse(
    getAuthorizationServerMetadata(getApplicationContext()),
  );
};

export const OPTIONS = () => corsPreflightResponse("GET, OPTIONS", "*");
