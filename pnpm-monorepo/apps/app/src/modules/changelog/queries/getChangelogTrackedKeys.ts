import { withTrace } from "@/modules/tracing/utils/withTrace";
import { cache } from "react";
import { CHANGELOG_ENTRIES } from "../entries";

/**
 * All tracked keys, without the cutoff of the viewer. The changelog page
 * observes fewer entries. `markChangelogEntriesSeen` uses this full list to
 * validate its input, thus do not replace it with the list of the page.
 */
export const getChangelogTrackedKeys = cache(
  withTrace("getChangelogTrackedKeys", () => {
    return CHANGELOG_ENTRIES.filter((entry) => entry.isTracked).map(
      (entry) => entry.key,
    );
  }),
);
