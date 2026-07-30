"use client";

import { env } from "@/env";
import { Link } from "@/modules/common/components/Link";
import clsx from "clsx";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { FaPlus } from "react-icons/fa";
import type { WikiTreeNode } from "../utils/buildVisibleWikiTree";
import { useCreateWikiPage } from "./CreateWikiPageProvider";
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
}

export const WikiPageTree = ({ className, nodes }: Props) => {
  return (
    <WikiPageDndProvider>
      <RootList className={className} nodes={nodes} />
    </WikiPageDndProvider>
  );
};

const RootList = ({ className, nodes }: Props) => {
  const { isPending } = useWikiPageDnd();

  return (
    <ul
      className={clsx(
        "relative flex flex-col gap-2",
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

interface CreateSubpageButtonProps {
  readonly pageId: string;
}

const CreateSubpageButton = ({ pageId }: CreateSubpageButtonProps) => {
  const { openCreateWikiPageModal } = useCreateWikiPage();

  return (
    <button
      type="button"
      onClick={() => openCreateWikiPageModal(pageId)}
      title="Neue Unterseite erstellen"
      className="p-1 text-neutral-500 cursor-pointer hover:text-interaction-500 focus-visible:text-interaction-500"
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
}

const TreeItem = ({
  node,
  depth,
  ancestorIds,
  previousSiblingId,
  nextSiblingId,
}: TreeItemProps) => {
  const pathname = usePathname();
  const { draggedPageId } = useWikiPageDnd();
  const activePageId = pathname.startsWith("/app/wiki/")
    ? pathname.split("/")[3]
    : undefined;
  const isActive = activePageId === node.id;

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
        style={{ marginLeft: `${depth * 12}px` }}
      >
        <span
          className={clsx(
            "group flex min-w-0 flex-1 items-center gap-1 rounded-secondary pl-2",
            {
              "bg-neutral-800": isActive,
            },
          )}
        >
          {node.iconId && (
            <Image
              src={`https://${env.NEXT_PUBLIC_S3_PUBLIC_URL}/${node.iconId}`}
              alt=""
              width={16}
              height={16}
              className="flex-none size-4 rounded-xs object-cover"
              unoptimized
            />
          )}

          <Link
            href={`/app/wiki/${node.id}/${node.slug}`}
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
            <span className="flex flex-none items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100">
              {node.canAdmin && (
                <WikiPageDragHandle
                  pageId={node.id}
                  previousSiblingId={previousSiblingId}
                  nextSiblingId={nextSiblingId}
                />
              )}
              {node.canEdit && <CreateSubpageButton pageId={node.id} />}
            </span>
          )}
        </span>

        <WikiPageDropTargets
          pageId={node.id}
          ancestorIds={ancestorIds}
          canDropInside={node.canEdit}
          hasChildren={node.children.length > 0}
          isRootLevel={depth === 0}
        />
      </span>

      {node.children.length > 0 && (
        <ul className="relative flex flex-col">
          <span
            aria-hidden
            className="absolute bottom-0 top-0 w-px bg-neutral-700"
            style={{ left: `${depth * 12 + 8}px` }}
          />
          {node.children.map((child, index) => (
            <TreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              ancestorIds={[...ancestorIds, node.id]}
              previousSiblingId={node.children[index - 1]?.id}
              nextSiblingId={node.children[index + 1]?.id}
            />
          ))}
        </ul>
      )}
    </li>
  );
};
