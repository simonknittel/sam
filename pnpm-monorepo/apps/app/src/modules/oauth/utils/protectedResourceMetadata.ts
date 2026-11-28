import "server-only";

import { getApplicationContext } from "@/modules/application";
import {
  getProtectedResourceMetadata,
  type OAuthResource,
} from "@sam-monorepo/application";
import { isOAuthResourceTurnedOff } from "./isOAuthResourceTurnedOff";
import { metadataResponse, temporarilyUnavailableResponse } from "./responses";

/**
 * Public by design: the clients read it before they have a token. The kill
 * switch of the resource stops it.
 */
export const protectedResourceMetadataResponse = async (
  resource: OAuthResource,
) => {
  if (await isOAuthResourceTurnedOff(resource))
    return temporarilyUnavailableResponse();

  return metadataResponse(
    getProtectedResourceMetadata(getApplicationContext(), resource),
  );
};
