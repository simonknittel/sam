"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { TextInput } from "@/modules/common/components/form/TextInput";
import Modal from "@/modules/common/components/Modal";
import { VariantWithLogo } from "@/modules/fleet/components/VariantWithLogo";
import { api, type RouterOutputs } from "@/trpc/react";
import { Autocomplete } from "@base-ui/react/autocomplete";
import type { Editor } from "@tiptap/react";
import { useState } from "react";
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

  const { data, isPending } = api.variant.getAll.useQuery(undefined);

  const normalized = query.toLowerCase().trim();
  const matches = (data ?? []).filter(
    (variant) =>
      !normalized ||
      variant.name.toLowerCase().includes(normalized) ||
      variant.manufacturerName.toLowerCase().includes(normalized),
  );
  const results = matches.slice(0, MAX_RESULTS);

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

  const pick = (variant: VariantOption) => {
    if (position === undefined) insertVariantLink(variant);
    else retargetVariantLink(variant, position);
    onRequestClose();
  };

  return (
    <Modal
      isOpen
      onRequestClose={onRequestClose}
      className="w-120"
      heading={<h2>{position === undefined ? "Schiff" : "Schiff ändern"}</h2>}
    >
      <Autocomplete.Root
        items={results}
        // The modal filters by ship and manufacturer name itself
        filter={null}
        value={query}
        onValueChange={setQuery}
        inline
        open
        // Enter picks the highlighted ship, by default the first one
        autoHighlight="always"
      >
        <Autocomplete.Input
          render={<TextInput hint="Nach Schiff oder Hersteller filtern" />}
          aria-label="Schiff suchen"
          placeholder="Carrack, Drake, …"
          autoFocus
        />

        {isPending ? (
          <div className="flex justify-center p-4">
            <AsciiSpinner className="text-2xl text-neutral-500" />
          </div>
        ) : results.length > 0 ? (
          <>
            <Autocomplete.List
              aria-label="Schiffe"
              className="mt-4 max-h-80 overflow-y-auto"
            >
              {(variant: VariantOption) => (
                <Autocomplete.Item
                  key={variant.id}
                  value={variant}
                  onClick={() => pick(variant)}
                  className="flex cursor-pointer items-center gap-2 rounded-secondary p-1 hover:bg-neutral-700 active:bg-neutral-600 data-highlighted:bg-neutral-700"
                >
                  <VariantWithLogo
                    className="min-w-0 flex-1"
                    variant={variant}
                    manufacturer={{ name: variant.manufacturerName }}
                    logo={
                      variant.manufacturerImage
                        ? {
                            src: getWikiImageUrl(variant.manufacturerImage.id),
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
                </Autocomplete.Item>
              )}
            </Autocomplete.List>

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
      </Autocomplete.Root>
    </Modal>
  );
};
