import { withTrace } from "@/modules/tracing/utils/withTrace";
import { cache } from "react";
import { CHANGELOG_ENTRIES } from "../entries";
import { getQuarterOfDate, type ChangelogQuarter } from "../utils/quarter";

export const getChangelogQuarters = cache(
  withTrace("getChangelogQuarters", () => {
    const quarters = new Map<string, ChangelogQuarter>();

    for (const entry of CHANGELOG_ENTRIES) {
      const quarter = getQuarterOfDate(entry.date);
      quarters.set(quarter.slug, quarter);
    }

    return [...quarters.values()].sort((a, b) => b.slug.localeCompare(a.slug));
  }),
);
