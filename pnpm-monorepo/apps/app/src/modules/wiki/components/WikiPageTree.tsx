"use client";

import { Link } from "@/modules/common/components/Link";
import clsx from "clsx";
import { usePathname } from "next/navigation";
import { FaChevronDown, FaChevronRight, FaPlus } from "react-icons/fa";
import type { WikiTreeNode } from "../utils/buildVisibleWikiTree";
import { buildWikiPageHref, getActiveWikiPageId } from "../utils/wikiPageHref";
import { useCreateWikiPage } from "./CreateWikiPageProvider";
import { useWikiPageHrefMode } from "./WikiPageHrefModeProvider";
import { WikiPageIcon } from "./WikiPageIcon";
import { useWikiPageTreeCollapse } from "./WikiPageTreeCollapseProvider";
import {
  useWikiPageDnd,
  WikiPageDndProvider,
  WikiPageDragHandle,
  WikiPageDropTargets,
  WikiPageTreeEndDropTarget,
} from "./WikiPageTreeDragAndDrop";

interface Props {
  readonly className?: string;
  readonly nodes: WikiTreeNode[];
  /** Pages rendered dimmed, e.g. sidebar-hidden ones shown via the toggle */
  readonly dimmedPageIds?: readonly string[];
}

export const WikiPageTree = ({ className, nodes, dimmedPageIds }: Props) => {
  return (
    <WikiPageDndProvider>
      <RootList
        className={className}
        nodes={nodes}
        dimmedPageIds={dimmedPageIds}
      />
    </WikiPageDndProvider>
  );
};

const RootList = ({ className, nodes, dimmedPageIds }: Props) => {
  const { isPending } = useWikiPageDnd();
  const dimmedIds = new Set(dimmedPageIds ?? []);

  return (
    <ul
      // Root rows are the only ones separated by a gap; WikiPageDropTargets
      // spans it from both sides, so changing it means adjusting those too
      className={clsx(
        "relative flex flex-col gap-4",
        {
          "animate-pulse cursor-wait pointer-events-none": isPending,
        },
        className,
      )}
    >
      {nodes.map((node, index) => (
        <TreeItem
          key={node.id}
          node={node}
          depth={0}
          ancestorIds={[]}
          previousSiblingId={nodes[index - 1]?.id}
          nextSiblingId={nodes[index + 1]?.id}
          dimmedIds={dimmedIds}
        />
      ))}
      {nodes.length > 0 && (
        <WikiPageTreeEndDropTarget
          lastRootPageId={nodes[nodes.length - 1].id}
        />
      )}
    </ul>
  );
};

interface ExpandButtonProps {
  readonly pageId: string;
  readonly subtreeId: string;
  readonly isExpanded: boolean;
}

const ExpandButton = ({ pageId, subtreeId, isExpanded }: ExpandButtonProps) => {
  const { toggle } = useWikiPageTreeCollapse();

  return (
    <button
      type="button"
      onClick={() => toggle(pageId)}
      aria-expanded={isExpanded}
      aria-controls={isExpanded ? subtreeId : undefined}
      title={isExpanded ? "Unterseiten ausblenden" : "Unterseiten anzeigen"}
      className="flex-none p-1 text-neutral-500 cursor-pointer hover:text-interaction-500 focus-visible:text-interaction-500 active:text-interaction-300"
    >
      {isExpanded ? (
        <FaChevronDown className="size-3" />
      ) : (
        <FaChevronRight className="size-3" />
      )}
    </button>
  );
};

interface CreateSubpageButtonProps {
  readonly pageId: string;
  /**
   * Shown disabled to those who may edit the page but not manage it — they
   * had this button before subpages became a manager's decision, so it
   * explains itself instead of silently disappearing.
   */
  readonly canCreate: boolean;
}

const CreateSubpageButton = ({
  pageId,
  canCreate,
}: CreateSubpageButtonProps) => {
  const { openCreateWikiPageModal } = useCreateWikiPage();

  return (
    <button
      type="button"
      onClick={() => openCreateWikiPageModal(pageId)}
      disabled={!canCreate}
      title={
        canCreate
          ? "Neue Unterseite erstellen"
          : "Unterseiten können nur Verwalter dieser Seite erstellen"
      }
      className={clsx("p-1", {
        "text-neutral-500 cursor-pointer hover:text-interaction-500 focus-visible:text-interaction-500":
          canCreate,
        "text-neutral-700 cursor-not-allowed": !canCreate,
      })}
    >
      <FaPlus className="size-3" />
    </button>
  );
};

interface TreeItemProps {
  readonly node: WikiTreeNode;
  readonly depth: number;
  /** Ids of the node's ancestors in the visible tree */
  readonly ancestorIds: readonly string[];
  readonly previousSiblingId?: string;
  readonly nextSiblingId?: string;
  readonly dimmedIds: ReadonlySet<string>;
}

const TreeItem = ({
  node,
  depth,
  ancestorIds,
  previousSiblingId,
  nextSiblingId,
  dimmedIds,
}: TreeItemProps) => {
  const pathname = usePathname();
  const hrefMode = useWikiPageHrefMode();
  const { draggedPageId } = useWikiPageDnd();
  const { isExpanded, expand } = useWikiPageTreeCollapse();
  const isActive = getActiveWikiPageId(hrefMode, pathname) === node.id;
  /** The event wiki's root page can neither be moved nor get siblings */
  const isLockedRoot = node.id === hrefMode.rootPageId;

  const hasChildren = node.children.length > 0;
  const showsChildren = hasChildren && isExpanded(node.id);
  const subtreeId = `wiki-subtree-${node.id}`;

  return (
    <li
      className={clsx({
        // Mute the dragged page including its whole subtree
        "opacity-25": draggedPageId === node.id,
      })}
    >
      <span
        className="relative flex items-center gap-1"
        // Margin instead of padding so the active background keeps a gap
        // matching the nesting level
        style={{ marginLeft: `${depth * 20}px` }}
      >
        <span
          className={clsx(
            "group flex min-w-0 flex-1 items-center gap-1 rounded-secondary pl-1",
            {
              "bg-neutral-800": isActive,
              // Row-level (not subtree-level) so nested dimmed pages don't compound
              "opacity-50": dimmedIds.has(node.id),
            },
          )}
        >
          {hasChildren ? (
            <ExpandButton
              pageId={node.id}
              subtreeId={subtreeId}
              isExpanded={showsChildren}
            />
          ) : (
            // Keeps titles aligned with those of their collapsible siblings
            <span aria-hidden className="size-5 flex-none" />
          )}

          {node.iconId && <WikiPageIcon iconId={node.iconId} />}

          <Link
            href={buildWikiPageHref(hrefMode, node)}
            // The tree can show a link for every page of the wiki, and each
            // prefetch is a full server render of the target page — too much
            // for links the viewer mostly never opens
            prefetch={false}
            className={clsx(
              "block flex-1 truncate py-1 pr-2 hover:text-interaction-500",
              {
                "text-neutral-50": isActive,
                "text-neutral-300": !isActive,
                // Root pages act as section headings
                "font-bold": depth === 0,
              },
            )}
            title={node.title}
          >
            {node.title}
          </Link>

          {(node.canAdmin || node.canEdit) && (
            // Collapsed to zero width instead of merely hidden, so the title
            // gets the whole row while the buttons are away and only gives
            // that space back once they appear
            <span className="flex w-0 flex-none items-center overflow-hidden group-hover:w-auto focus-within:w-auto">
              {node.canAdmin && !isLockedRoot && (
                <WikiPageDragHandle
                  pageId={node.id}
                  previousSiblingId={previousSiblingId}
                  nextSiblingId={nextSiblingId}
                />
              )}
              {node.canEdit && (
                <CreateSubpageButton
                  pageId={node.id}
                  canCreate={node.canAdmin}
                />
              )}
            </span>
          )}
        </span>

        <WikiPageDropTargets
          pageId={node.id}
          ancestorIds={ancestorIds}
          canDropInside={node.canAdmin}
          showsChildren={showsChildren}
          hasCollapsedChildren={hasChildren && !showsChildren}
          onRequestExpand={() => expand(node.id)}
          isRootLevel={depth === 0}
        />
      </span>

      {showsChildren && (
        <ul id={subtreeId} className="flex flex-col">
          {node.children.map((child, index) => (
            <TreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              ancestorIds={[...ancestorIds, node.id]}
              previousSiblingId={node.children[index - 1]?.id}
              nextSiblingId={node.children[index + 1]?.id}
              dimmedIds={dimmedIds}
            />
          ))}
        </ul>
      )}
    </li>
  );
};
