"use client";

import { usePopoverBaseUI } from "@/modules/common/components/PopoverBaseUI";
import type { WikiCalloutColor } from "@sam-monorepo/wiki-editor";
import type { Editor } from "@tiptap/react";
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
        onClick={() => {
          editor?.chain().focus().lift("wikiCallout").run();
          closePopover();
        }}
        className="ml-2 cursor-pointer text-xs text-neutral-400 hover:text-neutral-200"
      >
        Entfernen
      </button>
    </div>
  );
};
