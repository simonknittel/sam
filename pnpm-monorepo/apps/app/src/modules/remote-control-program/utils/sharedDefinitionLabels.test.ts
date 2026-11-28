import {
  ENTRY_CATEGORY_TITLES,
  ENTRY_TYPES_BY_CATEGORY,
  EntryCategory,
  PATTERNS,
} from "@/modules/log-analyzer/utils/PATTERNS";
import { getOldestLogAnalyzerEntryVersion } from "@sam-monorepo/domain";
import { expect, test } from "vitest";
import {
  CAPABILITY_LABELS,
  CONNECTOR_LABELS,
} from "../components/sharing-popover/catalogTexts";

/**
 * The German labels of the sharing popover for the UI of the desktop
 * companion: a part of the export of the shared definitions (see
 * `sharedDefinitions.test.ts` of `domain`). The labels are presentation, not
 * immutable data: they can change. The order of the types is the order of the
 * lists of the sharing popover. The local access layer keeps the rule of a
 * type under its oldest version.
 */
const DEFINITIONS = "../../../../../../../remote-control-program-definitions/";

test("the export of the labels", async () => {
  await expect(
    `${JSON.stringify(
      {
        log_entry_categories: Object.values(EntryCategory).map((category) => ({
          id: category,
          title: ENTRY_CATEGORY_TITLES[category],
          types: ENTRY_TYPES_BY_CATEGORY[category].map((type) => ({
            type,
            oldest_type: getOldestLogAnalyzerEntryVersion(type),
            title: PATTERNS[type].title,
          })),
        })),
        capabilities: CAPABILITY_LABELS,
        connectors: CONNECTOR_LABELS,
      },
      null,
      2,
    )}\n`,
  ).toMatchFileSnapshot(`${DEFINITIONS}labels.json`);
});
