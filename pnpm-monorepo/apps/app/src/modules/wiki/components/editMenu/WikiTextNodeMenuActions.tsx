"use client";

import type { WikiNodeAlignment } from "@sam-monorepo/wiki-editor";
import type { Editor } from "@tiptap/react";
import { FaParagraph, FaTrash } from "react-icons/fa";
import { ALIGNMENT_OPTIONS } from "../toolbar/alignments";
import { ToolbarButton } from "../toolbar/ToolbarButton";
import { ToolbarDivider } from "../toolbar/ToolbarDivider";
import { WikiDuplicateCopyActions } from "./WikiDuplicateCopyActions";
import type { WikiTextNodeMenuState } from "./wikiEditMenuState";

interface Props {
  readonly editor: Editor;
  readonly menu: WikiTextNodeMenuState;
}

/**
 * Actions of the paragraph/heading block menu. The menu is hover-raised,
 * so the live selection can sit in a different block — heading, paragraph
 * and alignment commands move the cursor into the menu's block first.
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

  const setTextParagraph = () => {
    editor
      .chain()
      .focus()
      .setTextSelection(menu.position + 1)
      .setParagraph()
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
      .focus()
      .deleteRange({ from: menu.position, to: menu.position + menu.nodeSize })
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
            isActive={menu.headingLevel === null}
            onClick={setTextParagraph}
          >
            <FaParagraph />
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
