"use client";

import { env } from "@/env";
import { Link } from "@/modules/common/components/Link";
import clsx from "clsx";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { FaPlus } from "react-icons/fa";
import type { WikiTreeNode } from "../utils/buildVisibleWikiTree";
import { useCreateWikiPage } from "./CreateWikiPageProvider";
import { WikiPageSortButtons } from "./WikiPageSortButtons";

interface Props {
  readonly className?: string;
  readonly nodes: WikiTreeNode[];
}

export const WikiPageTree = ({ className, nodes }: Props) => {
  return (
    <ul className={clsx("flex flex-col gap-2", className)}>
      {nodes.map((node) => (
        <TreeItem key={node.id} node={node} depth={0} />
      ))}
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
      className="p-1 text-neutral-500 cursor-pointer hover:text-neutral-200"
    >
      <FaPlus className="size-3" />
    </button>
  );
};

interface TreeItemProps {
  readonly node: WikiTreeNode;
  readonly depth: number;
}

const TreeItem = ({ node, depth }: TreeItemProps) => {
  const pathname = usePathname();
  const activePageId = pathname.startsWith("/app/wiki/")
    ? pathname.split("/")[3]
    : undefined;
  const isActive = activePageId === node.id;

  return (
    <li>
      <span
        className="flex items-center gap-1"
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
              "block flex-1 truncate py-1 pr-2 hover:text-interaction-300",
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
              {node.canAdmin && <WikiPageSortButtons pageId={node.id} />}
              {node.canEdit && <CreateSubpageButton pageId={node.id} />}
            </span>
          )}
        </span>
      </span>

      {node.children.length > 0 && (
        <ul className="relative flex flex-col">
          <span
            aria-hidden
            className="absolute bottom-0 top-0 w-px bg-neutral-700"
            style={{ left: `${depth * 12 + 8}px` }}
          />
          {node.children.map((child) => (
            <TreeItem key={child.id} node={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
};
