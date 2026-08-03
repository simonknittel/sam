"use client";

import type { JSONContent } from "@tiptap/core";
import type { Editor } from "@tiptap/react";
import toast from "react-hot-toast";
import { FaClone, FaCopy } from "react-icons/fa";
import { ToolbarButton } from "../toolbar/ToolbarButton";
import { setWikiCopiedBlock } from "../wikiBlockClipboard";

interface Props {
  readonly editor: Editor;
  readonly position: number;
  /** Node types expected at the position — guards stale menu positions */
  readonly typeNames: readonly string[];
}

/**
 * Duplicate and copy buttons shared by every block menu. Duplicate
 * inserts an identical sibling right below the block; copy fills the
 * app-wide clipboard slot the insert palettes (gutter plus button, slash
 * command) offer for insertion (wikiBlockClipboard).
 */
export const WikiDuplicateCopyActions = ({
  editor,
  position,
  typeNames,
}: Props) => {
  /**
   * Read fresh from the document — menu positions go stale under remote
   * collab edits.
   */
  const resolveNode = () => {
    const node = editor.state.doc.nodeAt(position);
    if (!node || !typeNames.includes(node.type.name)) return null;
    return node;
  };

  /**
   * Both actions focus at an explicit position: a bare focus() scrolls
   * the stale selection (wherever the cursor last was) into view,
   * jumping the viewport away from the block being acted on.
   */
  const duplicateNode = () => {
    const node = resolveNode();
    if (!node) return;
    editor
      .chain()
      .insertContentAt(position + node.nodeSize, node.toJSON() as JSONContent)
      .focus(position + node.nodeSize)
      .run();
  };

  const copyNode = () => {
    const node = resolveNode();
    if (!node) return;
    setWikiCopiedBlock(node);
    editor.commands.focus(position);
    toast.success("Kopiert – einfügbar über das Plus-Menü oder „/“");
  };

  return (
    <>
      <ToolbarButton
        title="Duplizieren"
        isActive={false}
        onClick={duplicateNode}
      >
        <FaClone />
      </ToolbarButton>

      <ToolbarButton title="Kopieren" isActive={false} onClick={copyNode}>
        <FaCopy />
      </ToolbarButton>
    </>
  );
};
