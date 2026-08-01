"use client";

import { usePopoverBaseUI } from "@/modules/common/components/PopoverBaseUI";
import type { WikiTextColor } from "@sam-monorepo/wiki-editor";
import type { Editor } from "@tiptap/react";
import { FaBan } from "react-icons/fa";
import { TextColorSwatches } from "./TextColorSwatches";

interface Props {
  readonly editor: Editor | null;
}

export const TextColorPicker = ({ editor }: Props) => {
  const { closePopover } = usePopoverBaseUI();

  const select = (color: WikiTextColor) => {
    editor?.chain().focus().toggleWikiTextColor(color).run();
    closePopover();
  };

  return (
    <div className="flex items-center gap-1">
      <TextColorSwatches onSelect={select} />

      <button
        type="button"
        title="Entfernen"
        onClick={() => {
          editor?.chain().focus().unsetWikiTextColor().run();
          closePopover();
        }}
        className="ml-2 flex size-8 cursor-pointer items-center justify-center rounded-secondary text-neutral-300 hover:bg-neutral-800"
      >
        <FaBan />
      </button>
    </div>
  );
};
