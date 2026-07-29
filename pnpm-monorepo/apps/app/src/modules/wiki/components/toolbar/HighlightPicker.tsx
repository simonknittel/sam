"use client";

import { usePopoverBaseUI } from "@/modules/common/components/PopoverBaseUI";
import { WIKI_HIGHLIGHT_COLORS } from "@sam-monorepo/wiki-editor";
import type { Editor } from "@tiptap/react";
import { FaBan } from "react-icons/fa";

interface Props {
  readonly editor: Editor | null;
}

export const HighlightPicker = ({ editor }: Props) => {
  const { closePopover } = usePopoverBaseUI();

  return (
    <div className="flex items-center gap-1">
      {WIKI_HIGHLIGHT_COLORS.map((color) => (
        <button
          key={color.value}
          type="button"
          title={color.name}
          onClick={() => {
            editor
              ?.chain()
              .focus()
              .toggleHighlight({ color: color.value })
              .run();
            closePopover();
          }}
          className="size-6 cursor-pointer rounded-secondary border border-neutral-700"
          style={{ backgroundColor: color.value }}
        />
      ))}

      <button
        type="button"
        title="Entfernen"
        onClick={() => {
          editor?.chain().focus().unsetHighlight().run();
          closePopover();
        }}
        className="ml-2 flex size-8 cursor-pointer items-center justify-center rounded-secondary text-neutral-300 hover:bg-neutral-800"
      >
        <FaBan />
      </button>
    </div>
  );
};
