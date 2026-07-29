"use client";

import { usePopoverBaseUI } from "@/modules/common/components/PopoverBaseUI";
import { useEditorState, type Editor } from "@tiptap/react";
import clsx from "clsx";
import { FaParagraph } from "react-icons/fa";

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
    <div className="flex items-center gap-1">
      {HEADING_LEVELS.map((level) => (
        <button
          key={level}
          type="button"
          title={`Überschrift ${level}`}
          onClick={() => {
            editor?.chain().focus().toggleHeading({ level }).run();
            closePopover();
          }}
          className={clsx(
            "flex size-8 cursor-pointer items-center justify-center rounded-secondary hover:bg-neutral-800",
            {
              "bg-neutral-800 text-interaction-500": activeLevel === level,
              "text-neutral-300": activeLevel !== level,
            },
          )}
        >
          <span className="text-xs font-bold">H{level}</span>
        </button>
      ))}

      <button
        type="button"
        title="Text"
        onClick={() => {
          editor?.chain().focus().setParagraph().run();
          closePopover();
        }}
        className="flex size-8 cursor-pointer items-center justify-center rounded-secondary text-neutral-300 hover:bg-neutral-800"
      >
        <FaParagraph />
      </button>
    </div>
  );
};
