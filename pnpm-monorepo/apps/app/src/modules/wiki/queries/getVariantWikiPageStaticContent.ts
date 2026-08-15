import { withTrace } from "@/modules/tracing/utils/withTrace";
import { cache } from "react";
import { GLOBAL_WIKI_HREF_MODE } from "../utils/wikiPageHref";
import type { VariantWikiContext } from "./getVariantWikiContext";
import {
  assembleWikiPageStaticContent,
  collectLinkableWikiPages,
  type WikiPageStaticContent,
} from "./getWikiPageStaticContent";

/**
 * The variant-scoped counterpart of `getWikiPageStaticContent`. All pages
 * live in the global wiki, so every readable page stays linkable — subtree
 * pages carry embed hrefs (inserted last, so they win over their global
 * entry), everything else links out to the global wiki. Page-index nodes
 * resolve against the sliced context only, so they can never list pages
 * outside the subtree.
 *
 * Callers must have checked the viewer's read permission for the page —
 * this resolves content, not access.
 */
export const getVariantWikiPageStaticContent = cache(
  withTrace(
    "getVariantWikiPageStaticContent",
    async (
      context: VariantWikiContext,
      pageId: string,
    ): Promise<WikiPageStaticContent> => {
      const loadLinkablePages = () =>
        Promise.resolve(
          Object.fromEntries([
            ...collectLinkableWikiPages(
              GLOBAL_WIKI_HREF_MODE,
              context.globalContext.pages,
              context.globalContext.permissions,
            ),
            ...collectLinkableWikiPages(
              context.hrefMode,
              context.pages,
              context.permissions,
            ),
          ]),
        );

      return assembleWikiPageStaticContent(
        context,
        pageId,
        loadLinkablePages,
        context.hrefMode,
      );
    },
  ),
);
