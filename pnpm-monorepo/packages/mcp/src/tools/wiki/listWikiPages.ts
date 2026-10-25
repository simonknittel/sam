import {
  listWikiPages,
  listWikiPagesInputSchema,
} from "@sam-monorepo/application";
import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import {
  defineTool,
  READ_ONLY_TOOL_ANNOTATIONS,
} from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";

export const listWikiPagesTool = defineTool({
  name: "list_wiki_pages",
  group: ToolGroup.Wiki,
  title: "List wiki pages",
  description:
    "Gives the wiki pages that the user can read, in the order of the page tree (depth first, with parent_id and depth). Without event_id it lists the global wiki, with event_id the briefing of that event; parent_id lists only the pages below that page. The ids are the keys for get_wiki_page; path is relative to the base URL of SAM",
  annotations: READ_ONLY_TOOL_ANNOTATIONS,
  readAuditEventType: AuditEventType.WIKI_PAGES_LISTED,
  inputSchema: listWikiPagesInputSchema,
  outputSchema: z.strictObject({
    pages: z.array(
      z.strictObject({
        id: z.string(),
        title: z.string(),
        slug: z.string(),
        path: z.string(),
        icon_id: z.string().nullable(),
        parent_id: z.string().nullable(),
        depth: z.number().int().min(0),
        child_count: z.number().int().min(0),
        can_add_children: z
          .boolean()
          .describe(
            "Whether the user can add a page below this page with create_wiki_page.",
          ),
      }),
    ),
    next_cursor: z.string().nullable(),
  }),
  // Each signed-in user can read the public pages. The use case checks each page.
  isVisible: () => true,
  handler: listWikiPages,
});
