"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { TextInput } from "@/modules/common/components/form/TextInput";
import Modal from "@/modules/common/components/Modal";
import { api, type RouterOutputs } from "@/modules/common/utils/api";
import { VariantWithLogo } from "@/modules/fleet/components/VariantWithLogo";
import type { Editor } from "@tiptap/react";
import clsx from "clsx";
import { useId, useState } from "react";
import { getWikiImageUrl } from "../utils/uploadWikiPageFile";

/**
 * Rows shown at once — every row renders a manufacturer logo, and a list
 * of hundreds of them is neither fast nor useful. Narrowing the filter
 * reaches everything else.
 */
const MAX_RESULTS = 25;

type VariantOption = RouterOutputs["variant"]["getAll"][number];

interface Props {
  readonly editor: Editor;
  /**
   * Document position of the variant link being changed — omitted when a
   * new link is inserted at the current selection.
   */
  readonly position?: number;
  readonly onRequestClose: () => void;
}

/**
 * Ship picker behind the palettes' "Schiff" entry and the edit menu's
 * "Schiff ändern" button: filtering by ship or manufacturer name, picking
 * one inserts (or retargets) the inline variant link. The document stores
 * the id plus the name at insertion time — the name only serves as the
 * label fallback and the searchable text.
 */
export const WikiVariantLinkModal = ({
  editor,
  position,
  onRequestClose,
}: Props) => {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const listboxId = useId();

  const { data, isPending } = api.variant.getAll.useQuery(undefined, {
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const normalized = query.toLowerCase().trim();
  const matches = (data ?? []).filter(
    (variant) =>
      !normalized ||
      variant.name.toLowerCase().includes(normalized) ||
      variant.manufacturerName.toLowerCase().includes(normalized),
  );
  const results = matches.slice(0, MAX_RESULTS);
  const optionId = (index: number) => `${listboxId}-option-${index}`;

  /**
   * Inserting at the caret parks it behind the atom with a trailing space
   * (mirrors the page link); with a selection the link replaces it.
   */
  const insertVariantLink = (variant: VariantOption) => {
    editor
      .chain()
      .focus()
      .insertContent(
        editor.state.selection.empty
          ? [
              {
                type: "wikiVariantLink",
                attrs: { variantId: variant.id, name: variant.name },
              },
              { type: "text", text: " " },
            ]
          : [
              {
                type: "wikiVariantLink",
                attrs: { variantId: variant.id, name: variant.name },
              },
            ],
      )
      .run();
  };

  const retargetVariantLink = (
    variant: VariantOption,
    nodePosition: number,
  ) => {
    /**
     * Guard against stale positions after collab edits — the node must
     * still be a variant link.
     */
    const node = editor.state.doc.nodeAt(nodePosition);
    if (node?.type.name !== "wikiVariantLink") return;

    editor
      .chain()
      .command(({ tr }) => {
        tr.setNodeAttribute(nodePosition, "variantId", variant.id);
        tr.setNodeAttribute(nodePosition, "name", variant.name);
        return true;
      })
      .run();
  };

  const pick = (variant: VariantOption | undefined) => {
    if (!variant) return;
    if (position === undefined) insertVariantLink(variant);
    else retargetVariantLink(variant, position);
    onRequestClose();
  };

  const moveActiveIndex = (next: number) => {
    setActiveIndex(next);
    document.getElementById(optionId(next))?.scrollIntoView({
      block: "nearest",
    });
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (results.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActiveIndex(Math.min(activeIndex + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActiveIndex(Math.max(activeIndex - 1, 0));
    }
  };

  return (
    <Modal
      isOpen
      onRequestClose={onRequestClose}
      className="w-120"
      heading={<h2>{position === undefined ? "Schiff" : "Schiff ändern"}</h2>}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          pick(results[activeIndex] ?? results[0]);
        }}
      >
        <TextInput
          aria-label="Schiff suchen"
          role="combobox"
          aria-expanded
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            results.length > 0 ? optionId(activeIndex) : undefined
          }
          hint="Nach Schiff oder Hersteller filtern"
          placeholder="Carrack, Drake, …"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={handleInputKeyDown}
          autoFocus
        />

        {isPending ? (
          <div className="flex justify-center p-4">
            <AsciiSpinner className="text-2xl text-neutral-500" />
          </div>
        ) : results.length > 0 ? (
          <>
            <ul
              id={listboxId}
              role="listbox"
              aria-label="Schiffe"
              className="mt-4 max-h-80 overflow-y-auto"
            >
              {results.map((variant, index) => (
                <li
                  key={variant.id}
                  id={optionId(index)}
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  <button
                    type="button"
                    onClick={() => pick(variant)}
                    className={clsx(
                      "flex w-full items-center gap-2 rounded-secondary p-1 text-left cursor-pointer",
                      { "bg-neutral-700": index === activeIndex },
                    )}
                  >
                    <VariantWithLogo
                      className="min-w-0 flex-1"
                      variant={variant}
                      manufacturer={{ name: variant.manufacturerName }}
                      logo={
                        variant.manufacturerImage
                          ? {
                              src: getWikiImageUrl(
                                variant.manufacturerImage.id,
                              ),
                              mimeType: variant.manufacturerImage.mimeType,
                            }
                          : null
                      }
                      size={32}
                      disableLink
                    />

                    <span className="flex-none text-xs text-neutral-400">
                      {variant.manufacturerName}
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            {matches.length > results.length && (
              <p className="mt-2 text-xs text-white/40">
                {matches.length - results.length} weitere Treffer — Filter
                eingrenzen.
              </p>
            )}
          </>
        ) : (
          <p className="mt-4 text-sm text-neutral-400">Keine Treffer.</p>
        )}
      </form>
    </Modal>
  );
};
