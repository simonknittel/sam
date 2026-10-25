import { searchWiki, searchWikiInputSchema } from "@sam-monorepo/application";
import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import {
  defineTool,
  READ_ONLY_TOOL_ANNOTATIONS,
} from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";

export const searchWikiTool = defineTool({
  name: "search_wiki",
  group: ToolGroup.Wiki,
  title: "Search the wiki",
  description:
    "Searches the titles, the text and the tags of the wiki pages that the user can read (German full-text search, the best match first) and the matching tag names. Without event_id it searches the global wiki, with event_id the briefing of that event. Give a page id to get_wiki_page for the full content; path is relative to the base URL of SAM",
  annotations: READ_ONLY_TOOL_ANNOTATIONS,
  readAuditEventType: AuditEventType.WIKI_SEARCHED,
  inputSchema: searchWikiInputSchema,
  outputSchema: z.strictObject({
    pages: z.array(
      z.strictObject({
        id: z.string(),
        title: z.string(),
        path: z.string(),
        snippet: z.string(),
        matched_tags: z.array(z.string()),
      }),
    ),
    tags: z.array(z.strictObject({ id: z.string(), name: z.string() })),
  }),
  // Each signed-in user can read the public pages. The use case checks each page.
  isVisible: () => true,
  handler: searchWiki,
});
