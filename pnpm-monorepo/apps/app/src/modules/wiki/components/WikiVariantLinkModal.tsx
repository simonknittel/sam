"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { ItemPickerListHeight } from "@/modules/common/components/ItemPicker/ItemPickerListHeight";
import { ItemPickerMode } from "@/modules/common/components/ItemPicker/ItemPickerMode";
import Modal from "@/modules/common/components/Modal";
import { VariantPanel } from "@/modules/fleet/components/VariantPicker/VariantPanel";
import type { VariantCatalogVariant } from "@/modules/fleet/queries/getVariantCatalog";
import { api } from "@/trpc/react";
import type { Editor } from "@tiptap/react";

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
 * "Schiff ändern" button: picking a ship inserts (or retargets) the inline
 * variant link. The document stores the id plus the name at insertion time
 * — the name only serves as the label fallback and the searchable text.
 */
export const WikiVariantLinkModal = ({
  editor,
  position,
  onRequestClose,
}: Props) => {
  const { data, isPending, isError } = api.variant.getAll.useQuery(undefined);

  /**
   * Inserting at the caret parks it behind the atom with a trailing space
   * (mirrors the page link); with a selection the link replaces it.
   */
  const insertVariantLink = (variant: VariantCatalogVariant) => {
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
    variant: VariantCatalogVariant,
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

  const pick = (variantId: VariantCatalogVariant["id"]) => {
    const variant = data?.variants.find((variant) => variant.id === variantId);
    if (!variant) return;

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
      {data && (
        <VariantPanel
          mode={ItemPickerMode.Single}
          catalog={data}
          selectedVariantIds={[]}
          onVariantClick={pick}
          listHeight={ItemPickerListHeight.Tall}
        />
      )}

      {isPending && (
        <div className="flex justify-center p-4">
          <AsciiSpinner className="text-2xl text-neutral-500" />
        </div>
      )}

      {isError && (
        <p className="text-sm text-brand-red-300">
          Die Schiffe konnten nicht geladen werden.
        </p>
      )}
    </Modal>
  );
};
