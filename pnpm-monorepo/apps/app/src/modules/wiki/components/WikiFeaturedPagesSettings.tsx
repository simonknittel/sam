"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import Note from "@/modules/common/components/Note";
import clsx from "clsx";
import { useId, useState, type KeyboardEvent, type MouseEvent } from "react";
import { FaSave, FaTrash } from "react-icons/fa";
import { MdDragIndicator } from "react-icons/md";
import { updateWikiFeaturedPages } from "../actions/updateWikiFeaturedPages";
import type { WikiPageTargetOption } from "../utils/getWikiPageTargets";
import { MAX_WIKI_FEATURED_PAGES } from "../utils/wikiFeaturedPages";
import { WikiPageSelect } from "./WikiPageSelect";

interface WikiFeaturedPage {
  readonly id: string;
  readonly title: string;
}

type DropPosition = "before" | "after";

interface Props {
  readonly initialPages: readonly WikiFeaturedPage[];
  /** Selectable pages in tree order, e.g. from getManageableWikiPageTargets */
  readonly targets: readonly WikiPageTargetOption[];
}

/**
 * Curates the ordered list of pages the wiki landing page highlights.
 * Adding, removing and reordering only change local state — the whole list
 * is stored when the form is submitted.
 */
export const WikiFeaturedPagesSettings = ({ initialPages, targets }: Props) => {
  const selectId = useId();
  const [pages, setPages] = useState<WikiFeaturedPage[]>([...initialPages]);
  const [selectedPageId, setSelectedPageId] = useState("");
  const [draggedPageId, setDraggedPageId] = useState<string | null>(null);

  const { state, formAction, isPending } = useAction(updateWikiFeaturedPages, {
    errorToast: false,
  });

  const availableTargets = targets.filter(
    (target) => !pages.some((page) => page.id === target.id),
  );
  const hasReachedLimit = pages.length >= MAX_WIKI_FEATURED_PAGES;

  const addPage = () => {
    const target = availableTargets.find(
      (candidate) => candidate.id === selectedPageId,
    );
    if (!target || hasReachedLimit) return;

    setPages([...pages, { id: target.id, title: target.title }]);
    setSelectedPageId("");
  };

  const movePage = (
    pageId: string,
    referenceId: string,
    position: DropPosition,
  ) => {
    if (pageId === referenceId) return;

    setPages((currentPages) => {
      const movedPage = currentPages.find((page) => page.id === pageId);
      if (!movedPage) return currentPages;

      const remainingPages = currentPages.filter((page) => page.id !== pageId);
      const referenceIndex = remainingPages.findIndex(
        (page) => page.id === referenceId,
      );
      if (referenceIndex < 0) return currentPages;

      const insertIndex =
        position === "before" ? referenceIndex : referenceIndex + 1;

      return remainingPages.toSpliced(insertIndex, 0, movedPage);
    });
  };

  const handleDragStart = (
    event: MouseEvent<HTMLButtonElement>,
    pageId: string,
  ) => {
    if (event.button !== 0) return;
    // Prevent text selection while dragging
    event.preventDefault();
    setDraggedPageId(pageId);
    // Cancels drops outside any band
    document.addEventListener("mouseup", () => setDraggedPageId(null), {
      once: true,
    });
  };

  const handleDrop = (referenceId: string, position: DropPosition) => {
    if (!draggedPageId) return;
    setDraggedPageId(null);
    movePage(draggedPageId, referenceId, position);
  };

  return (
    <div>
      {pages.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {pages.map((page, index) => (
            <WikiFeaturedPageRow
              key={page.id}
              page={page}
              isDragged={draggedPageId === page.id}
              isDropTarget={draggedPageId !== null && draggedPageId !== page.id}
              previousPageId={pages[index - 1]?.id}
              nextPageId={pages[index + 1]?.id}
              onDragStart={(event) => handleDragStart(event, page.id)}
              onMove={(referenceId, position) =>
                movePage(page.id, referenceId, position)
              }
              onDrop={(position) => handleDrop(page.id, position)}
              onRemove={() =>
                setPages(pages.filter((entry) => entry.id !== page.id))
              }
            />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-neutral-400">
          Keine Featured Seiten. Der Bereich erscheint dann nicht auf der
          Wiki-Startseite.
        </p>
      )}

      <form
        className="mt-4 flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          addPage();
        }}
      >
        <div className="flex-1">
          <label className="mb-1 block" htmlFor={selectId}>
            Seite hinzufügen
          </label>
          <WikiPageSelect
            id={selectId}
            value={selectedPageId}
            onChange={(event) => setSelectedPageId(event.target.value)}
            targets={availableTargets}
            emptyOptionLabel="Seite auswählen"
            disabled={hasReachedLimit}
          />
        </div>
        <Button2
          type="submit"
          variant={Button2Variant.Secondary}
          disabled={hasReachedLimit || selectedPageId === ""}
        >
          Hinzufügen
        </Button2>
      </form>

      {hasReachedLimit && (
        <p className="mt-1 text-xs text-white/40">
          Mehr als {MAX_WIKI_FEATURED_PAGES} Featured Seiten sind nicht möglich.
          Entferne zuerst eine Seite.
        </p>
      )}

      <form action={formAction} className="mt-4">
        {pages.map((page) => (
          <input key={page.id} type="hidden" name="pageId" value={page.id} />
        ))}

        <Note
          type="info"
          message="Featured Seiten erscheinen ganz oben auf der Wiki-Startseite — allerdings nur für die Personen, die sie auch lesen dürfen."
        />

        <Button2 type="submit" disabled={isPending} className="mt-4 ml-auto">
          {isPending ? <AsciiSpinner /> : <FaSave />}
          Speichern
        </Button2>

        <ActionErrorNote className="mt-4" state={state} />
      </form>
    </div>
  );
};

interface DropIndicatorLineProps {
  /** Position within the surrounding `group/band` */
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

interface RowProps {
  readonly page: WikiFeaturedPage;
  readonly isDragged: boolean;
  /** Whether another row is being dragged, i.e. this row accepts drops */
  readonly isDropTarget: boolean;
  /** Previous entry, target of ArrowUp */
  readonly previousPageId?: string;
  /** Next entry, target of ArrowDown */
  readonly nextPageId?: string;
  readonly onDragStart: (event: MouseEvent<HTMLButtonElement>) => void;
  /** Moves this page relative to one of its neighbours */
  readonly onMove: (referenceId: string, position: DropPosition) => void;
  /** Drops the dragged page relative to this row */
  readonly onDrop: (position: DropPosition) => void;
  readonly onRemove: () => void;
}

/**
 * One entry of the featured list. Dragging its handle starts a drag, the
 * bands overlaying the other rows drop the dragged page before or after
 * them — same interaction as the sidebar tree (see WikiPageTreeDragAndDrop).
 * The arrow keys replace the drag gesture.
 */
const WikiFeaturedPageRow = ({
  page,
  isDragged,
  isDropTarget,
  previousPageId,
  nextPageId,
  onDragStart,
  onMove,
  onDrop,
  onRemove,
}: RowProps) => {
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowUp" && previousPageId) {
      event.preventDefault();
      onMove(previousPageId, "before");
    } else if (event.key === "ArrowDown" && nextPageId) {
      event.preventDefault();
      onMove(nextPageId, "after");
    }
  };

  return (
    <li
      className={clsx(
        "relative flex items-center gap-2 rounded-secondary border border-neutral-800 px-3 py-2",
        { "opacity-50": isDragged },
      )}
    >
      <button
        type="button"
        onMouseDown={onDragStart}
        onKeyDown={handleKeyDown}
        title={`"${page.title}" verschieben (ziehen oder Pfeiltasten)`}
        className="cursor-grab p-1 text-neutral-500 hover:text-interaction-500 focus-visible:text-interaction-500 active:text-interaction-300"
      >
        <MdDragIndicator />
      </button>

      <span
        className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
        title={page.title}
      >
        {page.title}
      </span>

      <Button2
        type="button"
        variant={Button2Variant.Secondary}
        onClick={onRemove}
        title={`"${page.title}" entfernen`}
      >
        <FaTrash />
      </Button2>

      {isDropTarget && (
        <span className="absolute inset-0 z-10 flex cursor-grabbing flex-col">
          <span
            className="group/band relative h-1/2"
            onMouseUp={() => onDrop("before")}
          >
            {/* Half of the list's gap-1, i.e. centred between two rows */}
            <DropIndicatorLine className="-top-0.5 -translate-y-1/2" />
          </span>
          <span
            className="group/band relative h-1/2"
            onMouseUp={() => onDrop("after")}
          >
            <DropIndicatorLine className="-bottom-0.5 translate-y-1/2" />
          </span>
        </span>
      )}
    </li>
  );
};
