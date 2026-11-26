import { getApplicationUrls } from "@/modules/application";
import { metadataResponse } from "@/modules/oauth/utils/responses";
import { getDesktopCompanionClientMetadataDocument } from "@sam-monorepo/application";

/**
 * The Client ID Metadata Document of the desktop companion, on its client id.
 * The authorization server of the app knows the same document without a
 * fetch. Public and static.
 */
export const dynamic = "force-static";

export const GET = () =>
  metadataResponse(
    getDesktopCompanionClientMetadataDocument({ urls: getApplicationUrls() }),
  );
