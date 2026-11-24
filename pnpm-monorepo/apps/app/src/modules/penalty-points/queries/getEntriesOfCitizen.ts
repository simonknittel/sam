import {
  getApplicationContext,
  getRequestActor,
  throwApplicationErrorForPage,
} from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import {
  listPenaltyEntries,
  MAXIMUM_PAGE_LIMIT,
  PenaltyEntryStatus,
  type PenaltyEntryOutput,
} from "@sam-monorepo/application";
import { type Citizen } from "@sam-monorepo/database/client";

/** All pages: the tab of the citizen has no pagination */
export const getEntriesOfCitizen = withTrace(
  "getEntriesOfCitizen",
  async (citizenId: Citizen["id"], expired: "active" | "all" = "active") => {
    const context = getApplicationContext();
    const actor = await getRequestActor();

    const entries: PenaltyEntryOutput[] = [];
    let cursor: string | undefined;

    try {
      do {
        const page = await listPenaltyEntries(context, actor, {
          status:
            expired === "active"
              ? PenaltyEntryStatus.Active
              : PenaltyEntryStatus.NotDeleted,
          citizen_id: citizenId,
          limit: MAXIMUM_PAGE_LIMIT,
          cursor,
        });

        entries.push(...page.entries);
        cursor = page.next_cursor ?? undefined;
      } while (cursor);
    } catch (error) {
      return throwApplicationErrorForPage(error);
    }

    return entries;
  },
);
