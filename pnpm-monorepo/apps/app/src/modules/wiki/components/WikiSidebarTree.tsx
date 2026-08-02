"use client";

import clsx from "clsx";
import { useState } from "react";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa";
import type { WikiTreeNode } from "../utils/buildVisibleWikiTree";
import { serializeWikiShowHiddenPagesCookie } from "../utils/wikiShowHiddenPagesCookie";
import { WikiPageTree } from "./WikiPageTree";

interface Props {
  /** The tree with sidebar-hidden pages filtered out (the default view) */
  readonly tree: WikiTreeNode[];
  /** The tree including sidebar-hidden pages */
  readonly fullTree: WikiTreeNode[];
  /** Readable pages the sidebar mode hides — dimmed when shown */
  readonly hiddenPageIds: readonly string[];
  /** The toggle's remembered state, read from the cookie during SSR */
  readonly initialShowHidden: boolean;
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
}: Props) => {
  const [showHidden, setShowHidden] = useState(initialShowHidden);
  const nodes = showHidden ? fullTree : tree;

  const handleClick = () => {
    const next = !showHidden;
    setShowHidden(next);
    document.cookie = serializeWikiShowHiddenPagesCookie(next);
  };

  return (
    <>
      <div className="flex items-center justify-between px-2">
        <p className="text-sm text-white/40 font-mono uppercase">
          Inhaltsverzeichnis
        </p>

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
            className={clsx(
              "rounded-secondary p-1 cursor-pointer hover:bg-neutral-800 focus-visible:bg-neutral-800 active:bg-neutral-700",
              showHidden
                ? "text-interaction-300"
                : "text-neutral-500 hover:text-neutral-300",
            )}
          >
            {showHidden ? (
              <FaRegEye className="size-3.5" />
            ) : (
              <FaRegEyeSlash className="size-3.5" />
            )}
          </button>
        )}
      </div>

      {nodes.length > 0 ? (
        <WikiPageTree
          nodes={nodes}
          dimmedPageIds={showHidden ? hiddenPageIds : undefined}
        />
      ) : (
        <p className="text-sm text-neutral-400">Keine Seiten vorhanden.</p>
      )}
    </>
  );
};
