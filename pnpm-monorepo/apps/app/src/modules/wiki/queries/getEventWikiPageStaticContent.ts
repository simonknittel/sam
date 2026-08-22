import { withTrace } from "@/modules/tracing/utils/withTrace";
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

/**
 * The event-scoped counterpart of `getWikiPageStaticContent`. The linkable
 * pages span the event's own pages plus the readable global wiki pages —
 * event pages may link into the global wiki, never the other way around —
 * each carrying its own route. Page-index nodes resolve against the event
 * context only, so they can never list foreign pages.
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
    ): Promise<WikiPageStaticContent> => {
      const eventHrefMode = createEventWikiHrefMode(
        context.container,
        context.rootPage?.id ?? null,
      );

      const loadLinkablePages = async () => {
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
            eventHrefMode,
            context.pages,
            context.permissions,
          ),
        ]);
      };

      return assembleWikiPageStaticContent(
        context,
        pageId,
        loadLinkablePages,
        eventHrefMode,
      );
    },
  ),
);
