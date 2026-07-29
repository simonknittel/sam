"use client";

import { usePopoverBaseUI } from "@/modules/common/components/PopoverBaseUI";
import { useEditorState, type Editor } from "@tiptap/react";
import clsx from "clsx";

const HEADING_LEVELS = [1, 2, 3] as const;

interface Props {
  readonly editor: Editor | null;
}

export const HeadingPicker = ({ editor }: Props) => {
  const { closePopover } = usePopoverBaseUI();

  const activeLevel = useEditorState({
    editor,
    selector: ({ editor }) =>
      HEADING_LEVELS.find((level) => editor?.isActive("heading", { level })) ??
      null,
  });

  return (
    <div className="flex flex-col gap-1">
      {HEADING_LEVELS.map((level) => (
        <button
          key={level}
          type="button"
          onClick={() => {
            editor?.chain().focus().toggleHeading({ level }).run();
            closePopover();
          }}
          className={clsx(
            "cursor-pointer rounded-secondary px-2 py-1 text-left text-sm hover:bg-neutral-800",
            {
              "text-interaction-300": activeLevel === level,
              "text-neutral-300": activeLevel !== level,
            },
          )}
        >
          Überschrift {level}
        </button>
      ))}

      <button
        type="button"
        onClick={() => {
          editor?.chain().focus().setParagraph().run();
          closePopover();
        }}
        className="cursor-pointer rounded-secondary px-2 py-1 text-left text-sm text-neutral-300 hover:bg-neutral-800"
      >
        Text
      </button>
    </div>
  );
};
