import {
  listChangelogEntries,
  listChangelogEntriesInputSchema,
} from "@sam-monorepo/application";
import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import {
  defineTool,
  READ_ONLY_TOOL_ANNOTATIONS,
} from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";

export const listChangelogEntriesTool = defineTool({
  name: "list_changelog_entries",
  group: ToolGroup.Changelog,
  title: "List the changelog entries",
  description:
    "Gives the entries of the changelog of SAM (the release notes), the newest first: the key, the date, the title, the tags and the text as Markdown. Give a quarter (for example 2026-q4) for the entries of this quarter.",
  annotations: READ_ONLY_TOOL_ANNOTATIONS,
  readAuditEventType: AuditEventType.CHANGELOG_ENTRIES_LISTED,
  inputSchema: listChangelogEntriesInputSchema,
  outputSchema: z.strictObject({
    entries: z.array(
      z.strictObject({
        key: z.string(),
        date: z.iso.date(),
        title: z.string(),
        tags: z.array(z.string()),
        is_tracked: z
          .boolean()
          .describe(
            "Whether the app shows the entry as unseen until the user saw it.",
          ),
        markdown: z.string(),
      }),
    ),
    next_cursor: z.string().nullable(),
  }),
  isVisible: () => true,
  handler: listChangelogEntries,
});
