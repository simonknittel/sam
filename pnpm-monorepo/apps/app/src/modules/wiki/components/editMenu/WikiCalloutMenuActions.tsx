"use client";

import type { WikiCalloutColor } from "@sam-monorepo/wiki-editor";
import type { Editor } from "@tiptap/react";
import { FaBan, FaTrash } from "react-icons/fa";
import { CalloutColorSwatches } from "../toolbar/CalloutColorSwatches";
import { ToolbarButton } from "../toolbar/ToolbarButton";
import { ToolbarDivider } from "../toolbar/ToolbarDivider";
import type { WikiCalloutMenuState } from "./wikiEditMenuState";

interface Props {
  readonly editor: Editor;
  readonly menu: WikiCalloutMenuState;
}

/** Actions of the callout menu (color, unwrap, delete) */
export const WikiCalloutMenuActions = ({ editor, menu }: Props) => {
  const setCalloutColor = (color: WikiCalloutColor) => {
    editor
      .chain()
      .command(({ tr }) => {
        tr.setNodeAttribute(menu.position, "color", color);
        return true;
      })
      .run();
  };

  const removeCallout = () => {
    editor
      .chain()
      .focus()
      .setTextSelection(menu.position + 2)
      .lift("wikiCallout")
      .run();
  };

  /**
   * The callout menu state carries no nodeSize — read it fresh from the
   * document (which also guards against stale positions after collab
   * edits).
   */
  const deleteCallout = () => {
    const node = editor.state.doc.nodeAt(menu.position);
    if (node?.type.name !== "wikiCallout") return;
    editor
      .chain()
      .focus()
      .deleteRange({ from: menu.position, to: menu.position + node.nodeSize })
      .run();
  };

  return (
    <>
      <CalloutColorSwatches
        activeColor={menu.color}
        onSelect={setCalloutColor}
      />
      <ToolbarButton title="Entfernen" isActive={false} onClick={removeCallout}>
        <FaBan />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton
        title="Block löschen"
        isActive={false}
        onClick={deleteCallout}
      >
        <FaTrash />
      </ToolbarButton>
    </>
  );
};
