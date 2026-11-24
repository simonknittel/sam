"use client";

import type {
  WikiNodeAlignment,
  WikiTextSize,
} from "@sam-monorepo/wiki-editor";
import type { Editor } from "@tiptap/react";
import { FaParagraph, FaTrash } from "react-icons/fa";
import { ALIGNMENT_OPTIONS } from "../toolbar/alignments";
import { ToolbarButton } from "../toolbar/ToolbarButton";
import { ToolbarDivider } from "../toolbar/ToolbarDivider";
import { WikiBlockLayoutActions } from "./WikiBlockLayoutActions";
import { WikiDuplicateCopyActions } from "./WikiDuplicateCopyActions";
import type { WikiTextNodeMenuState } from "./wikiEditMenuState";

interface Props {
  readonly editor: Editor;
  readonly menu: WikiTextNodeMenuState;
}

/**
 * Heading, paragraph and alignment commands move the cursor into the menu's
 * block first, so they apply to it and not to wherever inside it the caret
 * happens to sit.
 */
export const WikiTextNodeMenuActions = ({ editor, menu }: Props) => {
  const toggleTextHeading = (level: 1 | 2 | 3) => {
    editor
      .chain()
      .focus()
      .setTextSelection(menu.position + 1)
      .toggleHeading({ level })
      .run();
  };

  /** Pass the size in both directions, see HeadingPicker */
  const setTextParagraph = (textSize: WikiTextSize | null) => {
    editor
      .chain()
      .focus()
      .setTextSelection(menu.position + 1)
      .setNode("paragraph", { textSize })
      .run();
  };

  const setTextAlignment = (value: WikiNodeAlignment) => {
    editor
      .chain()
      .focus()
      .setTextSelection(menu.position + 1)
      .setTextAlign(value)
      .run();
  };

  const deleteTextBlock = () => {
    editor
      .chain()
      .deleteRange({ from: menu.position, to: menu.position + menu.nodeSize })
      .focus(menu.position)
      .run();
  };

  return (
    <>
      {!menu.inTextOnlyBlock && (
        <>
          {([1, 2, 3] as const).map((level) => (
            <ToolbarButton
              key={level}
              title={`Überschrift ${level}`}
              isActive={menu.headingLevel === level}
              isToggle
              onClick={() => toggleTextHeading(level)}
            >
              <span className="text-xs font-bold">H{level}</span>
            </ToolbarButton>
          ))}
          <ToolbarButton
            title="Text"
            isActive={menu.headingLevel === null && menu.textSize === null}
            isToggle
            onClick={() => setTextParagraph(null)}
          >
            <FaParagraph />
          </ToolbarButton>

          <ToolbarButton
            title="Kleiner Text"
            isActive={menu.textSize === "small"}
            isToggle
            onClick={() => setTextParagraph("small")}
          >
            <FaParagraph className="text-[0.6rem]" />
          </ToolbarButton>

          <ToolbarDivider />

          {ALIGNMENT_OPTIONS.map(({ value, title, icon: Icon }) => (
            <ToolbarButton
              key={value}
              title={title}
              isActive={menu.textAlign === value}
              isToggle
              onClick={() => setTextAlignment(value)}
            >
              <Icon />
            </ToolbarButton>
          ))}

          <ToolbarDivider />
        </>
      )}

      {menu.topLevel && (
        <>
          <WikiBlockLayoutActions
            editor={editor}
            position={menu.position}
            widthPx={menu.widthPx}
            align={menu.align}
          />

          <ToolbarDivider />
        </>
      )}

      <WikiDuplicateCopyActions
        editor={editor}
        position={menu.position}
        typeNames={["paragraph", "heading"]}
      />

      <ToolbarButton
        title="Block löschen"
        isActive={false}
        onClick={deleteTextBlock}
      >
        <FaTrash />
      </ToolbarButton>
    </>
  );
};
