import { getWikiPage, getWikiPageInputSchema } from "@sam-monorepo/application";
import { AuditEventType } from "@sam-monorepo/domain";
import {
  defineTool,
  READ_ONLY_TOOL_ANNOTATIONS,
} from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";
import { wikiPageOutputSchema } from "./wikiPageOutputSchema.js";

export const getWikiPageTool = defineTool({
  name: "get_wiki_page",
  group: ToolGroup.Wiki,
  title: "Get a wiki page",
  description:
    "Gives a page of the global wiki or of an event briefing with its content as Markdown, its tags, the pages that it links to and the time of the last change. Content that Markdown cannot show (for example a page index) is a short placeholder in square brackets. Get the page id from list_wiki_pages or search_wiki; path is relative to the base URL of SAM",
  annotations: READ_ONLY_TOOL_ANNOTATIONS,
  readAuditEventType: AuditEventType.WIKI_PAGE_READ,
  inputSchema: getWikiPageInputSchema,
  outputSchema: wikiPageOutputSchema,
  // Each signed-in user can read the public pages. The use case checks the page.
  isVisible: () => true,
  handler: getWikiPage,
});
