import { getApplicationContext, getRequestActor } from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import {
  findOwnRecentWikiPageIds,
  findOwnWikiFavoritePageIds,
} from "@sam-monorepo/application";
import { cache } from "react";

/**
 * Unfiltered: the callers apply the visibility. The row of an invisible page
 * stays, in case the access returns.
 */
export const getWikiFavoritePageIds = cache(
  withTrace(
    "getWikiFavoritePageIds",
    async (): Promise<Set<string>> =>
      new Set(
        await findOwnWikiFavoritePageIds(
          getApplicationContext(),
          await getRequestActor(),
        ),
      ),
  ),
);

/** Newest first. Unfiltered like the favorites above. */
export const getWikiRecentVisitPageIds = cache(
  withTrace("getWikiRecentVisitPageIds", async (): Promise<string[]> =>
    findOwnRecentWikiPageIds(getApplicationContext(), await getRequestActor()),
  ),
);
