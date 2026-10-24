import {
  getApplicationContext,
  isApplicationError,
  mapApplicationErrorToRouteResponse,
  toActor,
} from "@/modules/application";
import { requireAuthenticationApi } from "@/modules/auth/server";
import apiErrorHandler from "@/modules/common/utils/apiErrorHandler";
import {
  createWikiCollabToken,
  createWikiCollabTokenInputSchema,
} from "@sam-monorepo/application";
import { NextResponse } from "next/server";

/**
 * A short-lived token for the connection of the editor to the collab server.
 * The editor gets a token for each connection and on an interval during the
 * connection. A route handler and not a server action: its URL stays the
 * same after a deploy, thus an editor that is open during a deploy continues
 * to get tokens.
 */
export async function GET(
  _request: Request,
  context: RouteContext<"/api/wiki/[pageId]/collab-token">,
) {
  try {
    const authentication = await requireAuthenticationApi(
      "/api/wiki/[pageId]/collab-token",
      "GET",
    );

    const { pageId } = await context.params;
    const input = createWikiCollabTokenInputSchema.parse({ page_id: pageId });

    const { token, canEdit } = await createWikiCollabToken(
      getApplicationContext(),
      await toActor(authentication.session),
      input,
    );

    return NextResponse.json(
      { token, canEdit },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    if (isApplicationError(error))
      return mapApplicationErrorToRouteResponse(error);

    return apiErrorHandler(error);
  }
}
