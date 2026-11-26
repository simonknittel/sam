import { protectedResourceMetadataResponse } from "@/modules/oauth/utils/protectedResourceMetadata";
import { corsPreflightResponse } from "@/modules/oauth/utils/responses";
import { OAuthResource } from "@sam-monorepo/application";

/**
 * RFC 9728 section 3.1: the resource of the Remote Control Program, which
 * only the desktop companion gets
 */
export const GET = () =>
  protectedResourceMetadataResponse(OAuthResource.RemoteControlProgram);

export const OPTIONS = () => corsPreflightResponse("GET, OPTIONS", "*");
