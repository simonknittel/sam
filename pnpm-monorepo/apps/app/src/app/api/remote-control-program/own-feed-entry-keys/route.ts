import {
  getApplicationContext,
  isApplicationError,
  mapApplicationErrorToRouteResponse,
  toActor,
} from "@/modules/application";
import { requireAuthenticationApi } from "@/modules/auth/server";
import apiErrorHandler from "@/modules/common/utils/apiErrorHandler";
import {
  findOwnFeedEntryKeys,
  findOwnFeedEntryKeysInputSchema,
} from "@sam-monorepo/application";
import { NextResponse } from "next/server";

const ROUTE_PATH = "/api/remote-control-program/own-feed-entry-keys";

/** An absent parameter is no limit. A text that is not a date fails the schema. */
const toDate = (value: string | null) =>
  value === null ? undefined : new Date(value);

/**
 * The keys of the own log entries that the relay has, for the browser
 * runtime: after a change of the active tab, it does not send these entries
 * again, and a request for older entries counts only the other entries. A
 * route handler and not a server action, like the connection token: its URL
 * stays the same after a deploy.
 *
 * Query: `start` and `end` (ISO 8601, `end` exclusive), `page_cursor` (the
 * `next_page_cursor` of the previous page). Answer: `{ "keys",
 * "next_page_cursor" }`. 403 also for an admin who assumes a user.
 */
export async function GET(request: Request) {
  try {
    const authentication = await requireAuthenticationApi(ROUTE_PATH, "GET");

    const { searchParams } = new URL(request.url);
    const input = findOwnFeedEntryKeysInputSchema.parse({
      start: toDate(searchParams.get("start")),
      end: toDate(searchParams.get("end")),
      page_cursor: searchParams.get("page_cursor") ?? undefined,
    });

    const { keys, nextPageCursor } = await findOwnFeedEntryKeys(
      getApplicationContext(),
      await toActor(authentication.session),
      input,
    );

    return NextResponse.json(
      { keys, next_page_cursor: nextPageCursor },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    if (isApplicationError(error))
      return mapApplicationErrorToRouteResponse(error);

    return apiErrorHandler(error);
  }
}
