"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { WikiTreeNode } from "../utils/buildVisibleWikiTree";
import { collectWikiPagesToExpand } from "../utils/collectWikiPagesToExpand";
import {
  expandWikiPages,
  hasAnyWikiPageExpanded,
  isWikiPageExpanded,
  parseWikiExpandedPagesCookie,
  serializeWikiExpandedPagesCookie,
  setWikiPageExpansion,
  WIKI_ALL_COLLAPSED,
  WIKI_ALL_EXPANDED,
} from "../utils/wikiExpandedPagesCookie";

interface WikiPageTreeCollapseContextValue {
  isExpanded: (pageId: string) => boolean;
  toggle: (pageId: string) => void;
  expand: (pageId: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  /** Whether the tree currently shows any subpages at all */
  hasAnyExpanded: boolean;
}

const splitPath = (path: string) => (path ? path.split(",") : []);

const WikiPageTreeCollapseContext = createContext<
  WikiPageTreeCollapseContextValue | undefined
>(undefined);

interface Props {
  readonly children: ReactNode;
  /** The tree the sidebar renders, used to find the active page's ancestors */
  readonly nodes: WikiTreeNode[];
  /** Raw cookie value, parsed here so no Set has to cross the RSC boundary */
  readonly cookieValue: string | undefined;
}

/**
 * Holds which sidebar pages are expanded. The state starts from the cookie,
 * so the server already renders it and nothing flashes on hydration, and is
 * written back on every change.
 *
 * Opening a page expands its ancestors and the page itself: without the
 * ancestors, reaching a nested page through the search or a link would leave
 * the sidebar showing no trace of where the viewer is, and expanding the page
 * itself puts its subpages within reach as the obvious next step. Both are
 * merged into the state rather than forced at render time, so "Alle
 * einklappen" can collapse them again.
 */
export const WikiPageTreeCollapseProvider = ({
  children,
  nodes,
  cookieValue,
}: Props) => {
  const pathname = usePathname();
  const activePageId = pathname.startsWith("/app/wiki/")
    ? pathname.split("/")[3]
    : undefined;

  /**
   * Joined instead of kept as an array: the tree arrives as a new array with
   * every server render, so only a value comparable by equality keeps the
   * adjustment below from rerunning on each of them.
   */
  const pagesToExpand = useMemo(
    () => collectWikiPagesToExpand(nodes, activePageId).join(","),
    [nodes, activePageId],
  );

  const [state, setState] = useState(() =>
    expandWikiPages(
      parseWikiExpandedPagesCookie(cookieValue),
      splitPath(pagesToExpand),
    ),
  );

  /**
   * Adjusting the state while rendering rather than in an effect, so a
   * navigation never paints the new page's surroundings collapsed first. The
   * snapshot is what makes this idempotent: reapplying the same pages must
   * not undo a "Alle einklappen" the viewer performed afterwards.
   */
  const [expandedForPage, setExpandedForPage] = useState(pagesToExpand);
  if (pagesToExpand !== expandedForPage) {
    setExpandedForPage(pagesToExpand);
    setState((previous) => expandWikiPages(previous, splitPath(pagesToExpand)));
  }

  useEffect(() => {
    document.cookie = serializeWikiExpandedPagesCookie(state);
  }, [state]);

  const value = useMemo(
    () => ({
      isExpanded: (pageId: string) => isWikiPageExpanded(state, pageId),
      toggle: (pageId: string) =>
        setState((previous) =>
          setWikiPageExpansion(
            previous,
            pageId,
            !isWikiPageExpanded(previous, pageId),
          ),
        ),
      expand: (pageId: string) =>
        setState((previous) => setWikiPageExpansion(previous, pageId, true)),
      expandAll: () => setState(WIKI_ALL_EXPANDED),
      collapseAll: () => setState(WIKI_ALL_COLLAPSED),
      hasAnyExpanded: hasAnyWikiPageExpanded(state),
    }),
    [state],
  );

  return (
    <WikiPageTreeCollapseContext.Provider value={value}>
      {children}
    </WikiPageTreeCollapseContext.Provider>
  );
};

/**
 * Check for undefined since the defaultValue of the context is undefined. If
 * it's still undefined, the provider component is missing.
 */
export const useWikiPageTreeCollapse = () => {
  const context = useContext(WikiPageTreeCollapseContext);
  if (!context) throw new Error("Provider missing!");
  return context;
};
