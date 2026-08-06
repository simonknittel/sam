"use client";

import { usePopoverBaseUI } from "@/modules/common/components/PopoverBaseUI";
import type { WikiTextSize } from "@sam-monorepo/wiki-editor";
import { useEditorState, type Editor } from "@tiptap/react";
import clsx from "clsx";
import type { ReactNode } from "react";
import { FaParagraph } from "react-icons/fa";

const HEADING_LEVELS = [1, 2, 3] as const;

interface TypeButtonProps {
  readonly title: string;
  readonly isActive: boolean;
  readonly onClick: () => void;
  readonly children: ReactNode;
}

const TypeButton = ({
  title,
  isActive,
  onClick,
  children,
}: TypeButtonProps) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    className={clsx(
      "flex size-8 cursor-pointer items-center justify-center rounded-secondary hover:bg-neutral-800",
      {
        "bg-neutral-800 text-interaction-500": isActive,
        "text-neutral-300": !isActive,
      },
    )}
  >
    {children}
  </button>
);

interface Props {
  readonly editor: Editor | null;
}

export const HeadingPicker = ({ editor }: Props) => {
  const { closePopover } = usePopoverBaseUI();

  const activeType = useEditorState({
    editor,
    selector: ({ editor }) => ({
      headingLevel:
        HEADING_LEVELS.find((level) => editor?.isActive("heading", { level })) ??
        null,
      isSmall: editor?.isActive("paragraph", { textSize: "small" }) ?? false,
    }),
  });

  /**
   * setNode copies the current block's attributes and merges the given
   * ones on top, so the size has to be passed in BOTH directions — a bare
   * setParagraph() would leave a small paragraph small. Width, position
   * and text alignment carry over as before.
   */
  const setParagraphSize = (textSize: WikiTextSize | null) => {
    editor?.chain().focus().setNode("paragraph", { textSize }).run();
    closePopover();
  };

  return (
    <div className="flex items-center gap-1">
      {HEADING_LEVELS.map((level) => (
        <TypeButton
          key={level}
          title={`Überschrift ${level}`}
          isActive={activeType?.headingLevel === level}
          onClick={() => {
            editor?.chain().focus().toggleHeading({ level }).run();
            closePopover();
          }}
        >
          <span className="text-xs font-bold">H{level}</span>
        </TypeButton>
      ))}

      <TypeButton
        title="Text"
        isActive={activeType?.headingLevel === null && !activeType.isSmall}
        onClick={() => setParagraphSize(null)}
      >
        <FaParagraph />
      </TypeButton>

      {/* The same glyph as "Text" at a smaller size — the contrast between
          the two sitting next to each other is what tells them apart */}
      <TypeButton
        title="Kleiner Text"
        isActive={activeType?.isSmall ?? false}
        onClick={() => setParagraphSize("small")}
      >
        <FaParagraph className="text-[0.6rem]" />
      </TypeButton>
    </div>
  );
};
