import "server-only";

import {
  getApplicationContext,
  getRequestActor,
  throwApplicationErrorForPage,
} from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { findCalendarEntries } from "@sam-monorepo/application";
import { parseLocalDateKey } from "@sam-monorepo/domain";
import { cache } from "react";

/**
 * The entries of the calendar of the viewer between the two days
 * ("YYYY-MM-DD", both included). The days are keys, not objects, thus
 * `cache()` gives one read for each render. The caller checks the range
 * first (see `findCalendarRangeProblem`).
 */
export const getCalendarEntries = cache(
  withTrace(
    "getCalendarEntries",
    async (
      startDateKey: string,
      endDateKey: string,
      includeRunningEvents: boolean,
    ) => {
      const start = parseLocalDateKey(startDateKey);
      const end = parseLocalDateKey(endDateKey);
      if (!start || !end) throw new Error("Invalid calendar range");

      try {
        return await findCalendarEntries(
          getApplicationContext(),
          await getRequestActor(),
          { range: { start, end }, includeRunningEvents },
        );
      } catch (error) {
        return throwApplicationErrorForPage(error);
      }
    },
  ),
);
