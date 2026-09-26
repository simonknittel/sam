import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { WikiPageLinkedPage } from "@sam-monorepo/wiki-editor";
import { cache } from "react";
import {
  createEventWikiHrefMode,
  GLOBAL_WIKI_HREF_MODE,
} from "../utils/wikiPageHref";
import type { EventWikiContext } from "./getEventWikiContext";
import { getWikiContext } from "./getWikiContext";
import {
  assembleWikiPageStaticContent,
  collectLinkableWikiPages,
  type WikiPageStaticContent,
} from "./getWikiPageStaticContent";

const getEventWikiHrefMode = (context: EventWikiContext) =>
  createEventWikiHrefMode(context.container, context.rootPage?.id ?? null);

/**
 * All pages an event wiki page can link to, by id: the event's own pages
 * plus the readable global wiki pages — event pages may link into the
 * global wiki, never the other way around — each carrying its own route.
 */
export const getEventWikiLinkablePages = async (
  context: EventWikiContext,
): Promise<Record<string, WikiPageLinkedPage>> => {
  const globalContext = await getWikiContext();

  return Object.fromEntries([
    ...(globalContext
      ? collectLinkableWikiPages(
          GLOBAL_WIKI_HREF_MODE,
          globalContext.pages,
          globalContext.permissions,
        )
      : []),
    ...collectLinkableWikiPages(
      getEventWikiHrefMode(context),
      context.pages,
      context.permissions,
    ),
  ]);
};

/**
 * The event-scoped counterpart of `getWikiPageStaticContent`, with the
 * linkable pages of `getEventWikiLinkablePages`. Page-index nodes resolve
 * against the event context only, so they can never list foreign pages.
 *
 * Callers must have checked the viewer's read permission for the page —
 * this resolves content, not access.
 */
export const getEventWikiPageStaticContent = cache(
  withTrace(
    "getEventWikiPageStaticContent",
    async (
      context: EventWikiContext,
      pageId: string,
    ): Promise<WikiPageStaticContent> =>
      assembleWikiPageStaticContent(
        context,
        pageId,
        () => getEventWikiLinkablePages(context),
        getEventWikiHrefMode(context),
      ),
  ),
);
