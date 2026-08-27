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
 * Actions of the paragraph/heading block menu. Heading, paragraph and
 * alignment commands move the cursor into the menu's block first, so they
 * apply to it and not to wherever inside it the caret happens to sit.
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

  /**
   * setNode copies the block's attributes and merges the given ones on
   * top, so the size has to be passed in BOTH directions — a bare
   * setParagraph() would leave a small paragraph small.
   */
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

  /**
   * Focus at the deletion point — a bare focus() scrolls the stale
   * selection (wherever the cursor last was) into view, jumping the
   * viewport away from the deleted block (see WikiDuplicateCopyActions).
   */
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
              onClick={() => toggleTextHeading(level)}
            >
              <span className="text-xs font-bold">H{level}</span>
            </ToolbarButton>
          ))}
          <ToolbarButton
            title="Text"
            isActive={menu.headingLevel === null && menu.textSize === null}
            onClick={() => setTextParagraph(null)}
          >
            <FaParagraph />
          </ToolbarButton>

          {/* The same glyph as "Text" at a smaller size — the contrast
              between the two next to each other tells them apart */}
          <ToolbarButton
            title="Kleiner Text"
            isActive={menu.textSize === "small"}
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
