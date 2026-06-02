import { withTrace } from "@/modules/tracing/utils/withTrace";
import { cache } from "react";
import { CHANGELOG_ENTRIES } from "../entries";

export const getChangelogEntriesByYear = cache(
  withTrace("getChangelogEntriesByYear", (year: string) => {
    return CHANGELOG_ENTRIES.filter((entry) => entry.key.startsWith(year));
  }),
);
