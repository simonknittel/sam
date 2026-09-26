"use client";

import { useWikiPageHrefMode } from "./WikiPageHrefModeProvider";

/**
 * How long a loaded list of linkable pages (tRPC `wiki.getLinkablePages`)
 * is used before it is loaded again. The list holds every page the viewer
 * can read in the scope, so the "[[" suggestion and the page link node
 * views share one copy, also across navigations, instead of loading it
 * again for each keystroke or each new link. Pages created or renamed
 * meanwhile show up after this time at the latest.
 */
export const WIKI_LINKABLE_PAGES_STALE_TIME_MS = 60 * 1000;

/** The input of `wiki.getLinkablePages` for the current wiki scope */
export const useWikiLinkablePagesInput = () => {
  const { container, variantId } = useWikiPageHrefMode();

  return {
    container: container ?? undefined,
    variantId: variantId ?? undefined,
  };
};
