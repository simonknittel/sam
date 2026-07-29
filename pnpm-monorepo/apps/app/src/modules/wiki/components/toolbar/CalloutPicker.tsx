"use client";

import { usePopoverBaseUI } from "@/modules/common/components/PopoverBaseUI";
import type { WikiCalloutColor } from "@sam-monorepo/wiki-editor";
import type { Editor } from "@tiptap/react";
import { FaBan } from "react-icons/fa";
import { CalloutColorSwatches } from "./CalloutColorSwatches";

interface Props {
  readonly editor: Editor | null;
}

export const CalloutPicker = ({ editor }: Props) => {
  const { closePopover } = usePopoverBaseUI();

  const select = (color: WikiCalloutColor) => {
    if (editor?.isActive("wikiCallout")) {
      editor?.chain().focus().setWikiCalloutColor(color).run();
    } else {
      editor?.chain().focus().toggleWikiCallout(color).run();
    }
    closePopover();
  };

  return (
    <div className="flex items-center gap-1">
      <CalloutColorSwatches onSelect={select} />

      <button
        type="button"
        title="Entfernen"
        onClick={() => {
          editor?.chain().focus().lift("wikiCallout").run();
          closePopover();
        }}
        className="ml-2 flex size-8 cursor-pointer items-center justify-center rounded-secondary text-neutral-300 hover:bg-neutral-800"
      >
        <FaBan />
      </button>
    </div>
  );
};
