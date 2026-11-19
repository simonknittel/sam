"use client";

import type { WikiTreeNode } from "@sam-monorepo/wiki-editor/helpers";
import clsx from "clsx";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  FaAngleDoubleDown,
  FaAngleDoubleUp,
  FaRegEye,
  FaRegEyeSlash,
} from "react-icons/fa";
import { findWikiTreePath } from "../utils/findWikiTreePath";
import { pruneWikiTree } from "../utils/pruneWikiTree";
import { getActiveWikiPageId } from "../utils/wikiPageHref";
import { serializeWikiShowHiddenPagesCookie } from "../utils/wikiShowHiddenPagesCookie";
import { useWikiPageHrefMode } from "./WikiPageHrefModeProvider";
import { WikiPageTree } from "./WikiPageTree";
import {
  useWikiPageTreeCollapse,
  WikiPageTreeCollapseProvider,
} from "./WikiPageTreeCollapseProvider";

/** Shared by the two header buttons so they read as one control group */
const HEADER_BUTTON_CLASS_NAME =
  "rounded-secondary p-1 cursor-pointer text-white/40 hover:text-interaction-500 hover:bg-neutral-800 focus-visible:text-interaction-500 focus-visible:bg-neutral-800 active:bg-neutral-700";

interface Props {
  /** The tree including sidebar-hidden pages */
  readonly tree: WikiTreeNode[];
  /**
   * Readable pages the sidebar mode hides — pruned from the default view
   * (except the path to an opened one), dimmed when shown
   */
  readonly hiddenPageIds: readonly string[];
  /** The toggle's remembered state, read from the cookie during SSR */
  readonly initialShowHidden: boolean;
  /** Raw value of the expanded-pages cookie, also read during SSR */
  readonly expandedPagesCookie: string | undefined;
}

/**
 * The sidebar's "Inhaltsverzeichnis" section: the page tree plus a toggle
 * revealing pages that a sidebar mode hides (shown dimmed). The button only
 * appears when hidden pages exist for this viewer.
 *
 * The server sends the full tree only once, and the default view is
 * derived from it here, so toggling needs no refetch — the cookie write
 * only carries the choice into the next server render.
 *
 * An opened hidden page also shows in the default view, together with its
 * hidden ancestors, so that the sidebar shows where the viewer is. Their
 * other subpages stay hidden.
 */
export const WikiSidebarTree = ({
  tree,
  hiddenPageIds,
  initialShowHidden,
  expandedPagesCookie,
}: Props) => {
  const hrefMode = useWikiPageHrefMode();
  const pathname = usePathname();
  const [showHidden, setShowHidden] = useState(initialShowHidden);
  const hiddenIds = new Set(hiddenPageIds);
  const revealedPageIds = findWikiTreePath(
    tree,
    getActiveWikiPageId(hrefMode, pathname),
  )
    .map((node) => node.id)
    .filter((pageId) => hiddenIds.has(pageId));
  const defaultTree = pruneWikiTree(
    tree,
    new Set(
      hiddenPageIds.filter((pageId) => !revealedPageIds.includes(pageId)),
    ),
  );
  const nodes = showHidden ? tree : defaultTree;
  const hasCollapsiblePages = nodes.some((node) => node.children.length > 0);

  const handleClick = () => {
    const next = !showHidden;
    setShowHidden(next);
    document.cookie = serializeWikiShowHiddenPagesCookie(next, hrefMode.scope);
  };

  return (
    <WikiPageTreeCollapseProvider
      nodes={nodes}
      cookieValue={expandedPagesCookie}
    >
      <div className="flex items-center justify-between px-2">
        <p className="font-mono text-sm text-white/40 uppercase">
          Inhaltsverzeichnis
        </p>

        <div className="flex items-center gap-1">
          {hasCollapsiblePages && <ToggleAllButton />}

          {hiddenPageIds.length > 0 && (
            <button
              type="button"
              onClick={handleClick}
              aria-pressed={showHidden}
              title={
                showHidden
                  ? "Ausgeblendete Seiten verbergen"
                  : "Ausgeblendete Seiten anzeigen"
              }
              className={clsx(HEADER_BUTTON_CLASS_NAME, {
                "text-interaction-500": showHidden,
              })}
            >
              {showHidden ? (
                <FaRegEye className="size-3.5" />
              ) : (
                <FaRegEyeSlash className="size-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {nodes.length > 0 ? (
        <WikiPageTree
          nodes={nodes}
          dimmedPageIds={showHidden ? hiddenPageIds : revealedPageIds}
        />
      ) : (
        <p className="text-sm text-neutral-400">Keine Seiten vorhanden.</p>
      )}
    </WikiPageTreeCollapseProvider>
  );
};

/**
 * Collapses the whole tree as long as anything is expanded, and expands it
 * again once nothing is — so the icon always announces what the click does,
 * even from a partially expanded tree.
 */
const ToggleAllButton = () => {
  const { hasAnyExpanded, expandAll, collapseAll } = useWikiPageTreeCollapse();

  return (
    <button
      type="button"
      onClick={hasAnyExpanded ? collapseAll : expandAll}
      title={hasAnyExpanded ? "Alle einklappen" : "Alle ausklappen"}
      className={clsx(HEADER_BUTTON_CLASS_NAME)}
    >
      {hasAnyExpanded ? (
        <FaAngleDoubleUp className="size-3.5" />
      ) : (
        <FaAngleDoubleDown className="size-3.5" />
      )}
    </button>
  );
};
