"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import Note from "@/modules/common/components/Note";
import { SubmitButton } from "@/modules/common/components/SubmitButton";
import {
  SORTABLE_HANDLE_ATTRIBUTES,
  useSortableList,
} from "@/modules/common/utils/useSortableList";
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import { useId, useState } from "react";
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

  const { state, formAction } = useAction(updateWikiFeaturedPages, {
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

  const getPageTitle = (id: UniqueIdentifier) =>
    pages.find((page) => page.id === id)?.title ?? "";
  const { sensors, accessibility } = useSortableList(getPageTitle);

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;

    const oldIndex = pages.findIndex((page) => page.id === active.id);
    const newIndex = pages.findIndex((page) => page.id === over.id);
    setPages(arrayMove(pages, oldIndex, newIndex));
  };

  return (
    <div>
      {pages.length > 0 ? (
        /**
         * The `id` and the modifiers have the same reasons as in the list of
         * the career flows (see `FlowsTableClient`).
         */
        <DndContext
          id="wiki-featured-pages"
          sensors={sensors}
          accessibility={accessibility}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={pages.map((page) => page.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="flex flex-col gap-1">
              {pages.map((page) => (
                <WikiFeaturedPageRow
                  key={page.id}
                  page={page}
                  onRemove={() =>
                    setPages(pages.filter((entry) => entry.id !== page.id))
                  }
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
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

        <SubmitButton icon={<FaSave />} className="mt-4 ml-auto">
          Speichern
        </SubmitButton>

        <ActionErrorNote className="mt-4" state={state} />
      </form>
    </div>
  );
};

interface RowProps {
  readonly page: WikiFeaturedPage;
  readonly onRemove: () => void;
}

/**
 * The row and its handle look like the rows of the sidebar tree. The handle
 * moves the row (see `useSortableList`).
 */
const WikiFeaturedPageRow = ({ page, onRemove }: RowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.id, attributes: SORTABLE_HANDLE_ATTRIBUTES });

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={clsx(
        "relative flex items-center gap-2 rounded-secondary border border-neutral-800 px-3 py-2",
        { "z-10 bg-neutral-800": isDragging },
      )}
    >
      {/* Without `touch-none` a touch on the handle scrolls the page */}
      <button
        type="button"
        title={`"${page.title}" verschieben (ziehen oder Leertaste und Pfeiltasten)`}
        className="cursor-grab touch-none p-1 text-neutral-500 hover:text-interaction-500 focus-visible:text-interaction-500 active:cursor-grabbing active:text-interaction-300"
        {...attributes}
        {...listeners}
      >
        <MdDragIndicator />
      </button>

      <span className="flex-1 truncate" title={page.title}>
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
    </li>
  );
};
