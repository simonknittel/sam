import { withTrace } from "@/modules/tracing/utils/withTrace";
import { cache } from "react";
import { CHANGELOG_ENTRIES } from "../entries";

export const getChangelogYears = cache(
  withTrace("getChangelogYears", () => {
    return [
      ...new Set(CHANGELOG_ENTRIES.map((entry) => entry.key.slice(0, 4))),
    ].sort((a, b) => b.localeCompare(a));
  }),
);
