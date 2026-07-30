import { withTrace } from "@/modules/tracing/utils/withTrace";
import { cache } from "react";
import { CHANGELOG_ENTRIES } from "../entries";

export const getChangelogTrackedKeys = cache(
  withTrace("getChangelogTrackedKeys", () => {
    return CHANGELOG_ENTRIES.filter((entry) => entry.isTracked).map(
      (entry) => entry.key,
    );
  }),
);
