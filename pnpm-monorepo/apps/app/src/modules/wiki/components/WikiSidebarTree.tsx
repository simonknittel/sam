"use client";

import clsx from "clsx";
import { useState } from "react";
import {
  FaAngleDoubleDown,
  FaAngleDoubleUp,
  FaRegEye,
  FaRegEyeSlash,
} from "react-icons/fa";
import type { WikiTreeNode } from "../utils/buildVisibleWikiTree";
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
  /** The tree with sidebar-hidden pages filtered out (the default view) */
  readonly tree: WikiTreeNode[];
  /** The tree including sidebar-hidden pages */
  readonly fullTree: WikiTreeNode[];
  /** Readable pages the sidebar mode hides — dimmed when shown */
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
 * Both trees are rendered from props the server already sent, so toggling
 * needs no refetch — the cookie write only carries the choice into the next
 * server render.
 */
export const WikiSidebarTree = ({
  tree,
  fullTree,
  hiddenPageIds,
  initialShowHidden,
  expandedPagesCookie,
}: Props) => {
  const hrefMode = useWikiPageHrefMode();
  const [showHidden, setShowHidden] = useState(initialShowHidden);
  const nodes = showHidden ? fullTree : tree;
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
        <p className="text-sm text-white/40 font-mono uppercase">
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
          dimmedPageIds={showHidden ? hiddenPageIds : undefined}
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
