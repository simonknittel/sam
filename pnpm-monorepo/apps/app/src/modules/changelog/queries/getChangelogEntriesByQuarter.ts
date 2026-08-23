import { withTrace } from "@/modules/tracing/utils/withTrace";
import { cache } from "react";
import { CHANGELOG_ENTRIES } from "../entries";
import { getQuarterOfDate } from "../utils/quarter";

export const getChangelogEntriesByQuarter = cache(
  withTrace("getChangelogEntriesByQuarter", (quarterSlug: string) => {
    return CHANGELOG_ENTRIES.filter(
      (entry) => getQuarterOfDate(entry.date).slug === quarterSlug,
    );
  }),
);
