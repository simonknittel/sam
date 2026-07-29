"use client";

import { usePopoverBaseUI } from "@/modules/common/components/PopoverBaseUI";
import { WIKI_GRID_COLUMN_COUNTS } from "@sam-monorepo/wiki-editor";
import type { Editor } from "@tiptap/react";

interface Props {
  readonly editor: Editor | null;
}

export const GridPicker = ({ editor }: Props) => {
  const { closePopover } = usePopoverBaseUI();

  return (
    <div className="flex flex-col gap-1">
      {WIKI_GRID_COLUMN_COUNTS.map((columns) => (
        <button
          key={columns}
          type="button"
          onClick={() => {
            editor?.chain().focus().insertWikiGrid(columns).run();
            closePopover();
          }}
          className="cursor-pointer rounded-secondary px-2 py-1 text-left text-sm text-neutral-300 hover:bg-neutral-800"
        >
          {columns} Spalten
        </button>
      ))}
    </div>
  );
};
