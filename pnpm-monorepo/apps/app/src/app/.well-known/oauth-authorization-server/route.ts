import { getApplicationContext } from "@/modules/application";
import { areAllOAuthResourcesTurnedOff } from "@/modules/oauth/utils/isOAuthResourceTurnedOff";
import {
  corsPreflightResponse,
  metadataResponse,
  temporarilyUnavailableResponse,
} from "@/modules/oauth/utils/responses";
import { getAuthorizationServerMetadata } from "@sam-monorepo/application";

/**
 * RFC 8414. Public by design: the clients read it before they have a token.
 * Both resources use it, thus it stops only with both kill switches.
 */
export const GET = async () => {
  if (await areAllOAuthResourcesTurnedOff())
    return temporarilyUnavailableResponse();

  return metadataResponse(
    getAuthorizationServerMetadata(getApplicationContext()),
  );
};

export const OPTIONS = () => corsPreflightResponse("GET, OPTIONS", "*");
