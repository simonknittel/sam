import { CHANGELOG_ENTRIES } from "@/modules/changelog/entries";
import type { TrackedChangelogEntry } from "@sam-monorepo/application";

/** The entries change only with a deployment, thus the list is built once */
const TRACKED_CHANGELOG_ENTRIES: readonly TrackedChangelogEntry[] =
  CHANGELOG_ENTRIES.filter((entry) => entry.isTracked).map(({ key, date }) => ({
    key,
    date,
  }));

/** All tracked entries, without the cutoff of the viewer */
export const listTrackedChangelogEntries = () => TRACKED_CHANGELOG_ENTRIES;
