import {
  createWikiPage,
  createWikiPageInputSchema,
} from "@sam-monorepo/application";
import { defineTool } from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";
import { wikiPageOutputSchema } from "./wikiPageOutputSchema.js";

export const createWikiPageTool = defineTool({
  name: "create_wiki_page",
  group: ToolGroup.Wiki,
  title: "Create a wiki page",
  description:
    "Creates a page with a title and optional Markdown content (CommonMark with the tables and the task lists of GitHub). The page goes below parent_id (a page from list_wiki_pages or get_wiki_page with can_add_children true), below the root page of the briefing of event_id, or without both at the top of the global wiki, where only the user and wiki;manage can see it at first. Content that the wiki cannot hold in its place becomes plain paragraphs, and HTML stays text. Existing pages do not change. Gives the new page like get_wiki_page.",
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  inputSchema: createWikiPageInputSchema,
  outputSchema: wikiPageOutputSchema,
  /**
   * The management of a parent page can also come from the permissions of
   * the page or from the managers of an event. The use case checks the
   * parent.
   */
  isVisible: (actor) =>
    actor.citizen !== null &&
    (actor.authorize("wiki", "create") ||
      actor.authorize("wiki", "manage") ||
      actor.authorize("event", "read")),
  handler: createWikiPage,
});
