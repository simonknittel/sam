"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { Link } from "@/modules/common/components/Link";
import Modal from "@/modules/common/components/Modal";
import Note from "@/modules/common/components/Note";
import { api } from "@/modules/common/utils/api";
import clsx from "clsx";
import { useId, useState } from "react";
import { FaPen, FaSave, FaTag, FaTrash } from "react-icons/fa";
import { updateWikiPageTags } from "../actions/updateWikiPageTags";
import { buildWikiTagHref } from "../utils/wikiPageHref";
import { useWikiPageHrefMode } from "./WikiPageHrefModeProvider";

const MAX_TAGS_PER_PAGE = 20;
const MAX_TAG_NAME_LENGTH = 50;
const SUGGESTION_LIMIT = 10;

interface Tag {
  readonly id: string;
  readonly name: string;
}

interface Props {
  readonly className?: string;
  readonly pageId: string;
  readonly tags: readonly Tag[];
  readonly canEdit: boolean;
}

/**
 * Tag chips in the page header, each linking to the tag's list page. Editors
 * additionally get a modal replacing the page's tag set; existing tag names
 * are suggested while typing so duplicates don't come into existence.
 */
export const WikiPageTags = ({ className, pageId, tags, canEdit }: Props) => {
  const hrefMode = useWikiPageHrefMode();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNames, setSelectedNames] = useState<string[]>([]);

  if (!canEdit && tags.length <= 0) return null;

  const openModal = () => {
    setSelectedNames(tags.map((tag) => tag.name));
    setIsOpen(true);
  };

  return (
    <div className={clsx("flex flex-wrap items-center gap-1", className)}>
      {tags.map((tag) => (
        <Link
          key={tag.id}
          href={buildWikiTagHref(hrefMode, tag.id)}
          className="flex items-center gap-1 rounded-secondary bg-neutral-700/50 py-1 px-2 text-sm text-neutral-300 hover:bg-neutral-700 hover:text-interaction-500 focus-visible:text-interaction-500"
          title={`Alle Seiten mit dem Tag "${tag.name}" anzeigen`}
        >
          <FaTag className="size-3 flex-none text-neutral-500" />
          {tag.name}
        </Link>
      ))}

      {canEdit && (
        <>
          <Button2
            type="button"
            onClick={openModal}
            variant={Button2Variant.IconOnly}
            tooltip="Tags bearbeiten"
          >
            {tags.length <= 0 ? (
              <span className="flex items-center gap-2 text-sm font-normal normal-case">
                <FaTag /> Tags
              </span>
            ) : (
              <FaPen />
            )}
          </Button2>

          <TagsModal
            pageId={pageId}
            isOpen={isOpen}
            onRequestClose={() => setIsOpen(false)}
            selectedNames={selectedNames}
            setSelectedNames={setSelectedNames}
          />
        </>
      )}
    </div>
  );
};

interface TagsModalProps {
  readonly pageId: string;
  readonly isOpen: boolean;
  readonly onRequestClose: () => void;
  readonly selectedNames: readonly string[];
  readonly setSelectedNames: (names: string[]) => void;
}

const TagsModal = ({
  pageId,
  isOpen,
  onRequestClose,
  selectedNames,
  setSelectedNames,
}: TagsModalProps) => {
  const { eventId } = useWikiPageHrefMode();
  const inputId = useId();
  const [query, setQuery] = useState("");
  const { state, formAction, isPending } = useAction(updateWikiPageTags, {
    errorToast: false,
    onSuccess: onRequestClose,
  });

  const { data: existingTags } = api.wiki.getTags.useQuery(
    { eventId: eventId ?? undefined },
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      enabled: isOpen,
    },
  );

  const normalizedQuery = query.trim().replaceAll(/\s+/g, " ");
  const isSelected = (name: string) =>
    selectedNames.some(
      (selected) => selected.toLocaleLowerCase() === name.toLocaleLowerCase(),
    );

  const suggestions = (existingTags ?? [])
    .filter(
      (tag) =>
        !isSelected(tag.name) &&
        (normalizedQuery.length <= 0 ||
          tag.name
            .toLocaleLowerCase()
            .includes(normalizedQuery.toLocaleLowerCase())),
    )
    .slice(0, SUGGESTION_LIMIT);

  const limitReached = selectedNames.length >= MAX_TAGS_PER_PAGE;

  const addTag = (name: string) => {
    if (name.length <= 0 || limitReached || isSelected(name)) return;
    /**
     * An existing tag's casing wins over the typed one, matching the
     * server-side find-or-create.
     */
    const existing = existingTags?.find(
      (tag) => tag.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
    );
    setSelectedNames([...selectedNames, existing?.name ?? name]);
    setQuery("");
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      className="w-120"
      heading={<h2>Tags bearbeiten</h2>}
    >
      <form action={formAction}>
        <input type="hidden" name="id" value={pageId} />

        <label className="mb-1 block" htmlFor={inputId}>
          Tag hinzufügen
        </label>
        <input
          id={inputId}
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            addTag(normalizedQuery);
          }}
          maxLength={MAX_TAG_NAME_LENGTH}
          disabled={limitReached}
          placeholder="z.B. Datenbank"
          className="w-full rounded-secondary border border-neutral-700 bg-transparent px-3 h-9 text-sm focus-visible:border-neutral-500 focus-visible:outline-none disabled:opacity-50"
        />

        {(suggestions.length > 0 ||
          (normalizedQuery.length > 0 && !isSelected(normalizedQuery))) && (
          <div className="mt-2 flex flex-wrap gap-1">
            {suggestions.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => addTag(tag.name)}
                disabled={limitReached}
                className="flex items-center gap-1 rounded-secondary bg-neutral-700/50 py-1 px-2 text-sm text-neutral-300 hover:bg-neutral-700 focus-visible:bg-neutral-700 disabled:opacity-50 cursor-pointer"
              >
                <FaTag className="size-3 flex-none text-neutral-500" />
                {tag.name}
              </button>
            ))}

            {normalizedQuery.length > 0 &&
              !isSelected(normalizedQuery) &&
              !suggestions.some(
                (tag) =>
                  tag.name.toLocaleLowerCase() ===
                  normalizedQuery.toLocaleLowerCase(),
              ) && (
                <button
                  type="button"
                  onClick={() => addTag(normalizedQuery)}
                  disabled={limitReached}
                  className="flex items-center gap-1 rounded-secondary border border-dashed border-neutral-600 py-1 px-2 text-sm text-neutral-400 hover:border-neutral-400 hover:text-neutral-200 focus-visible:border-neutral-400 focus-visible:text-neutral-200 disabled:opacity-50 cursor-pointer"
                >
                  &quot;{normalizedQuery}&quot; neu anlegen
                </button>
              )}
          </div>
        )}

        {limitReached && (
          <Note
            type="info"
            className="mt-2"
            message={`Maximal ${MAX_TAGS_PER_PAGE} Tags pro Seite.`}
          />
        )}

        <p className="mt-4">Ausgewählte Tags</p>

        {selectedNames.length > 0 ? (
          <div className="mt-1 flex flex-wrap gap-1">
            {selectedNames.map((name) => (
              <span key={name.toLocaleLowerCase()}>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedNames(
                      selectedNames.filter((selected) => selected !== name),
                    )
                  }
                  title={`Tag "${name}" entfernen`}
                  className="flex items-center gap-2 rounded-secondary bg-neutral-700/50 py-1 px-2 text-sm hover:bg-neutral-700 focus-visible:bg-neutral-700 cursor-pointer"
                >
                  <FaTag className="size-3 flex-none text-neutral-500" />
                  {name}
                  <FaTrash className="flex-none text-brand-red-500 hover:text-brand-red-300" />
                </button>

                <input type="hidden" name="tagName[]" value={name} />
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-1 text-sm text-neutral-400">
            Keine Tags ausgewählt.
          </p>
        )}

        <Button2 type="submit" disabled={isPending} className="mt-4 ml-auto">
          {isPending ? <AsciiSpinner /> : <FaSave />}
          Speichern
        </Button2>

        <ActionErrorNote className="mt-4" state={state} />
      </form>
    </Modal>
  );
};
