"use client";

import type {
  WikiHighlightColor,
  WikiTextColor,
} from "@sam-monorepo/wiki-editor";
import type { Editor } from "@tiptap/react";
import { FaBan } from "react-icons/fa";
import { HighlightSwatches } from "../toolbar/HighlightSwatches";
import { TextColorSwatches } from "../toolbar/TextColorSwatches";
import {
  TEXT_FORMAT_OPTIONS,
  toggleWikiTextFormat,
} from "../toolbar/textFormats";
import { ToolbarButton } from "../toolbar/ToolbarButton";
import { ToolbarDivider } from "../toolbar/ToolbarDivider";
import type { WikiTextSelectionMenuState } from "./wikiEditMenuState";

interface Props {
  readonly editor: Editor;
  readonly menu: WikiTextSelectionMenuState;
}

/**
 * Actions of the formatting menu (marks, text color, highlight). The menu
 * only exists while the selection is inside its block, so the commands run
 * on the live selection: they hit exactly the selected text, and keeping
 * the selection keeps the menu alive after a click.
 */
export const WikiTextSelectionMenuActions = ({ editor, menu }: Props) => {
  const toggleTextMark = (
    name: (typeof TEXT_FORMAT_OPTIONS)[number]["name"],
  ) => {
    toggleWikiTextFormat(editor.chain().focus(), name);
  };

  const toggleTextColor = (color: WikiTextColor) => {
    editor.chain().focus().toggleWikiTextColor(color).run();
  };

  const toggleTextHighlight = (color: WikiHighlightColor) => {
    editor.chain().focus().toggleHighlight({ color }).run();
  };

  return (
    <>
      {TEXT_FORMAT_OPTIONS.map(({ name, title, icon: Icon }) => (
        <ToolbarButton
          key={name}
          title={title}
          isActive={menu.activeMarks.includes(name)}
          onClick={() => toggleTextMark(name)}
        >
          <Icon />
        </ToolbarButton>
      ))}

      <ToolbarDivider />

      <TextColorSwatches
        activeColor={menu.activeTextColor}
        onSelect={toggleTextColor}
      />
      <ToolbarButton
        title="Textfarbe entfernen"
        isActive={false}
        onClick={() => editor.chain().focus().unsetWikiTextColor().run()}
      >
        <FaBan />
      </ToolbarButton>

      <ToolbarDivider />

      <HighlightSwatches
        activeColor={menu.activeHighlightColor}
        onSelect={toggleTextHighlight}
      />
      <ToolbarButton
        title="Textmarker entfernen"
        isActive={false}
        onClick={() => editor.chain().focus().unsetHighlight().run()}
      >
        <FaBan />
      </ToolbarButton>
    </>
  );
};
