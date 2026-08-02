"use client";

import type { WikiCalloutColor } from "@sam-monorepo/wiki-editor";
import type { Editor } from "@tiptap/react";
import { FaBan, FaTrash } from "react-icons/fa";
import { CalloutColorSwatches } from "../toolbar/CalloutColorSwatches";
import { ToolbarButton } from "../toolbar/ToolbarButton";
import { ToolbarDivider } from "../toolbar/ToolbarDivider";
import { WikiDuplicateCopyActions } from "./WikiDuplicateCopyActions";
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
   * edits). Focus at the deletion point — a bare focus() scrolls the
   * stale selection (wherever the cursor last was) into view, jumping
   * the viewport away from the deleted block (see
   * WikiDuplicateCopyActions).
   */
  const deleteCallout = () => {
    const node = editor.state.doc.nodeAt(menu.position);
    if (node?.type.name !== "wikiCallout") return;
    editor
      .chain()
      .deleteRange({ from: menu.position, to: menu.position + node.nodeSize })
      .focus(menu.position)
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

      <WikiDuplicateCopyActions
        editor={editor}
        position={menu.position}
        typeNames={["wikiCallout"]}
      />

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
