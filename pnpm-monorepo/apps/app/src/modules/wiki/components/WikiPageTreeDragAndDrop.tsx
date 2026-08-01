"use client";

import { runAction } from "@/modules/actions/utils/runAction";
import clsx from "clsx";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useTransition,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { MdDragIndicator } from "react-icons/md";
import { updateWikiPagePosition } from "../actions/updateWikiPagePosition";

type DropPosition = "before" | "after" | "inside";

interface WikiPageDndContextValue {
  draggedPageId: string | null;
  isPending: boolean;
  handleDragStart: (
    event: MouseEvent<HTMLButtonElement>,
    pageId: string,
  ) => void;
  handleDrop: (referenceId: string, position: DropPosition) => void;
  submitPosition: (
    pageId: string,
    referenceId: string,
    position: DropPosition,
  ) => void;
}

const WikiPageDndContext = createContext<WikiPageDndContextValue | undefined>(
  undefined,
);

interface ProviderProps {
  readonly children: ReactNode;
}

/**
 * Mouse-based drag'n'drop for the sidebar tree, following the pattern of the
 * event lineup (`LineupOrderContext`): the drag handle starts a drag on
 * mousedown, the drop targets overlaying the other rows submit on mouseup,
 * and a document-level mouseup cancels drops outside any target.
 */
export const WikiPageDndProvider = ({ children }: ProviderProps) => {
  const [draggedPageId, setDraggedPageId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleCancel = useCallback(() => {
    setDraggedPageId(null);
  }, []);

  const handleDragStart = useCallback(
    (event: MouseEvent<HTMLButtonElement>, pageId: string) => {
      if (event.button !== 0) return;
      // Prevent text selection while dragging
      event.preventDefault();
      setDraggedPageId(pageId);
      document.addEventListener("mouseup", handleCancel, { once: true });
    },
    [handleCancel],
  );

  const submitPosition = useCallback(
    (pageId: string, referenceId: string, position: DropPosition) => {
      startTransition(async () => {
        const formData = new FormData();
        formData.set("id", pageId);
        formData.set("referenceId", referenceId);
        formData.set("position", position);
        await runAction(updateWikiPagePosition, formData, {
          // The successful reorder is visible in the sidebar itself
          successToast: false,
        });
      });
    },
    [],
  );

  const handleDrop = useCallback(
    (referenceId: string, position: DropPosition) => {
      if (!draggedPageId || draggedPageId === referenceId) return;
      setDraggedPageId(null);
      submitPosition(draggedPageId, referenceId, position);
    },
    [draggedPageId, submitPosition],
  );

  const value = useMemo(
    () => ({
      draggedPageId,
      isPending,
      handleDragStart,
      handleDrop,
      submitPosition,
    }),
    [draggedPageId, isPending, handleDragStart, handleDrop, submitPosition],
  );

  return (
    <WikiPageDndContext.Provider value={value}>
      {children}
    </WikiPageDndContext.Provider>
  );
};

/**
 * Check for undefined since the defaultValue of the context is undefined. If
 * it's still undefined, the provider component is missing.
 */
export const useWikiPageDnd = () => {
  const context = useContext(WikiPageDndContext);
  if (!context) throw new Error("Provider missing!");
  return context;
};

interface DragHandleProps {
  readonly pageId: string;
  /** Previous sibling in the visible tree, target of ArrowUp */
  readonly previousSiblingId?: string;
  /** Next sibling in the visible tree, target of ArrowDown */
  readonly nextSiblingId?: string;
}

export const WikiPageDragHandle = ({
  pageId,
  previousSiblingId,
  nextSiblingId,
}: DragHandleProps) => {
  const { handleDragStart, submitPosition, isPending } = useWikiPageDnd();

  // Keyboard replacement for the drag gesture
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowUp" && previousSiblingId) {
      event.preventDefault();
      submitPosition(pageId, previousSiblingId, "before");
    } else if (event.key === "ArrowDown" && nextSiblingId) {
      event.preventDefault();
      submitPosition(pageId, nextSiblingId, "after");
    }
  };

  return (
    <button
      type="button"
      disabled={isPending}
      onMouseDown={(event) => handleDragStart(event, pageId)}
      onKeyDown={handleKeyDown}
      title="Seite verschieben (ziehen oder Pfeiltasten)"
      className="p-1 text-neutral-500 cursor-grab hover:text-interaction-500 focus-visible:text-interaction-500 disabled:opacity-50"
    >
      <MdDragIndicator className="size-3" />
    </button>
  );
};

interface DropTargetsProps {
  readonly pageId: string;
  /** Ids of the row's ancestors in the visible tree */
  readonly ancestorIds: readonly string[];
  /** Whether the viewer may create subpages, i.e. drop other pages inside */
  readonly canDropInside: boolean;
  /** Whether the row shows children in the visible tree */
  readonly hasChildren: boolean;
  /** Root rows are separated by a flex gap; their zones extend into it */
  readonly isRootLevel: boolean;
}

interface DropIndicatorLineProps {
  /** Position within the surrounding `group/band`, e.g. `-top-1 -translate-y-1/2` */
  readonly className: string;
}

/** Line shown while the pointer is over the band containing it */
const DropIndicatorLine = ({ className }: DropIndicatorLineProps) => (
  <span
    className={clsx(
      "pointer-events-none absolute inset-x-0 hidden h-0.5 rounded-full bg-green-500 group-hover/band:block",
      className,
    )}
  />
);

/**
 * Overlay covering a tree row while a drag is active: the top band inserts
 * the dragged page before the row, the rest makes it the row's first
 * subpage. Rows without children additionally offer an after band; on rows
 * with children that position sits visually between the row and its first
 * child, so it must drop inside instead — "after the subtree" is reachable
 * via the next row's before band and the end-of-tree target.
 *
 * The before/after indicator is a line centered on the boundary between two
 * rows: the shared row edge for nested rows, the middle of the list gap for
 * root rows (whose bands also extend their hit areas into the gap). Two
 * adjacent zones targeting the same position therefore show one identical,
 * centered line.
 */
export const WikiPageDropTargets = ({
  pageId,
  ancestorIds,
  canDropInside,
  hasChildren,
  isRootLevel,
}: DropTargetsProps) => {
  const { draggedPageId, handleDrop } = useWikiPageDnd();

  if (!draggedPageId || draggedPageId === pageId) return null;
  // Dropping a page into its own subtree would create a cycle
  if (ancestorIds.includes(draggedPageId)) return null;

  const edgeBandHeight = canDropInside ? "h-1/4" : "h-1/2";

  return (
    <span className="absolute inset-0 z-10 flex cursor-grabbing flex-col">
      <span
        className={clsx("group/band relative", edgeBandHeight)}
        onMouseUp={() => handleDrop(pageId, "before")}
      >
        {isRootLevel && (
          // Extends the hit area into the upper half of the list gap
          <span className="absolute inset-x-0 -top-1 h-1" />
        )}
        <DropIndicatorLine
          className={clsx("-translate-y-1/2", isRootLevel ? "-top-1" : "top-0")}
        />
      </span>
      {canDropInside && (
        <span
          className="group/band flex-1"
          onMouseUp={() => handleDrop(pageId, "inside")}
        >
          {/*
           * Anchored to the container (hence no `relative` on the band) so
           * the fill always matches the row box, i.e. the active-page
           * background.
           */}
          <span className="pointer-events-none absolute inset-0 hidden rounded-secondary bg-green-500/20 group-hover/band:block" />
        </span>
      )}
      {!hasChildren && (
        <span
          className={clsx("group/band relative", edgeBandHeight)}
          onMouseUp={() => handleDrop(pageId, "after")}
        >
          {isRootLevel && (
            // Extends the hit area into the lower half of the list gap
            <span className="absolute inset-x-0 -bottom-1 h-1" />
          )}
          <DropIndicatorLine
            className={clsx(
              "translate-y-1/2",
              isRootLevel ? "-bottom-1" : "bottom-0",
            )}
          />
        </span>
      )}
    </span>
  );
};

interface TreeEndDropTargetProps {
  /** Last root page of the visible tree */
  readonly lastRootPageId: string;
}

/**
 * Drop zone below the whole tree, inserting the dragged page at the end of
 * the root level. Necessary because the last root page's own after band is
 * not available when it has children. Positioned absolutely, overhanging the
 * tree's box, so appearing while dragging causes no layout shift. Requires
 * `relative` on the root list.
 */
export const WikiPageTreeEndDropTarget = ({
  lastRootPageId,
}: TreeEndDropTargetProps) => {
  const { draggedPageId, handleDrop } = useWikiPageDnd();

  if (!draggedPageId || draggedPageId === lastRootPageId) return null;

  return (
    <li
      className="group/band absolute inset-x-0 top-full z-10 h-6 cursor-grabbing"
      onMouseUp={() => handleDrop(lastRootPageId, "after")}
    >
      {/* At the same height as the after band line of a childless last row */}
      <DropIndicatorLine className="top-1 -translate-y-1/2" />
    </li>
  );
};
