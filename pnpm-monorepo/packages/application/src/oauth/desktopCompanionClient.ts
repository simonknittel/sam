import {
  DESKTOP_COMPANION_CLIENT_ID_PATH,
  DESKTOP_COMPANION_REDIRECT_URI,
  REMOTE_CONTROL_PROGRAM_SCOPE,
} from "@sam-monorepo/domain";
import type { ApplicationContext } from "../context.js";
import type { ClientMetadataDocument } from "./clientMetadataDocument.js";

type ClientContext = Pick<ApplicationContext, "urls">;

export const DESKTOP_COMPANION_CLIENT_NAME = "SAM Desktop Companion";

/**
 * The client id of the desktop companion: the URL of its Client ID Metadata
 * Document on this host. Each environment has its own client id, thus the
 * program builds it from its SAM address.
 */
export const getDesktopCompanionClientId = ({ urls }: ClientContext) =>
  new URL(DESKTOP_COMPANION_CLIENT_ID_PATH, urls.baseUrl).href;

export const isDesktopCompanionClientId = (
  context: ClientContext,
  clientId: string,
) => clientId === getDesktopCompanionClientId(context);

/**
 * The app serves the document on the client id. The authorization server
 * uses the same values without a fetch (decision 35 of the Remote Control
 * Program), thus the local stack works with `http://localhost` and without
 * `OAUTH_ALLOW_INSECURE_LOOPBACK_CLIENT_IDS`.
 */
export const getDesktopCompanionClientMetadataDocument = (
  context: ClientContext,
) =>
  ({
    client_id: getDesktopCompanionClientId(context),
    client_name: DESKTOP_COMPANION_CLIENT_NAME,
    client_uri: context.urls.baseUrl.href,
    redirect_uris: [DESKTOP_COMPANION_REDIRECT_URI],
    token_endpoint_auth_method: "none",
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    scope: REMOTE_CONTROL_PROGRAM_SCOPE,
  }) satisfies ClientMetadataDocument;
