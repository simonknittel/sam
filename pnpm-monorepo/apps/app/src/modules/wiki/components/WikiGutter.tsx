"use client";

import {
  PopoverBaseUI,
  usePopoverBaseUI,
} from "@/modules/common/components/PopoverBaseUI";
import {
  offset,
  type ComputePositionConfig,
  type Middleware,
} from "@floating-ui/react-dom";
import type { WikiCalloutColor } from "@sam-monorepo/wiki-editor";
import { DragHandle } from "@tiptap/extension-drag-handle-react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { Editor } from "@tiptap/react";
import clsx from "clsx";
import { useCallback, useEffect, useState } from "react";
import { FaPlus, FaTrash } from "react-icons/fa";
import { MdDragIndicator, MdVerticalAlignCenter } from "react-icons/md";
import { CalloutColorSwatches } from "./toolbar/CalloutColorSwatches";
import { setWikiGutterHighlight } from "./WikiActiveNodeHighlight";

interface HoveredBlock {
  readonly node: ProseMirrorNode;
  readonly pos: number;
}

const BUTTON_CLASS_NAME =
  "flex size-5 items-center justify-center rounded-secondary text-neutral-500 hover:bg-neutral-800 hover:text-neutral-200";

/**
 * Keeps the buttons in the gutter column: the drag-handle plugin anchors
 * to the hovered node's DOM box, so for centered or resized blocks
 * (images, embeds) the handle would follow the block's left edge into the
 * page. This shifts it back to the editor's content-box left edge (the
 * pl-16 gutter). The editor element is resolved through the floating
 * element — the plugin mounts its wrapper next to the ProseMirror root.
 */
const alignWithGutter: Middleware = {
  name: "alignWithWikiGutter",
  fn: ({ x, elements }) => {
    const editorDom =
      elements.floating.parentElement?.parentElement?.querySelector(
        ".ProseMirror",
      );
    if (!(editorDom instanceof HTMLElement)) return {};

    const editorRect = editorDom.getBoundingClientRect();
    const paddingLeft =
      Number.parseFloat(window.getComputedStyle(editorDom).paddingLeft) || 0;
    const referenceRect = elements.reference.getBoundingClientRect();
    const delta = referenceRect.left - (editorRect.left + paddingLeft);

    return delta > 0 ? { x: x - delta } : {};
  },
};

/**
 * Must be identity-stable (module scope): the DragHandle wrapper tears down
 * and re-registers its plugin (hiding the handle) whenever this prop
 * changes.
 */
const COMPUTE_POSITION_CONFIG: ComputePositionConfig = {
  placement: "left-start",
  middleware: [
    offset({
      mainAxis: 4,
      crossAxis: 4,
    }),
    alignWithGutter,
  ],
};

interface Props {
  readonly editor: Editor;
}

/**
 * Gutter controls left of the hovered top-level block: a plus button
 * inserting a block below (Alt: above) and a grip that drags the block
 * and opens the block actions on click. The contextual edit menu
 * (WikiEditMenu) stays reserved for the deepest hovered element — block
 * scope lives here, so nested nodes and their ancestors never compete
 * for the same popover space.
 */
export const WikiGutter = ({ editor }: Props) => {
  const [block, setBlock] = useState<HoveredBlock | null>(null);

  /**
   * Identity-stable for the same reason as COMPUTE_POSITION_CONFIG — an
   * inline handler would re-register the plugin on every render, hiding
   * the handle whenever the pointer rests.
   */
  const handleNodeChange = useCallback(
    ({ node, pos }: { node: ProseMirrorNode | null; pos: number }) => {
      setBlock((previous) => {
        if (!node) return null;
        if (previous?.node === node && previous.pos === pos) return previous;
        return { node, pos };
      });
    },
    [],
  );

  const insertBlock = (event: React.MouseEvent) => {
    if (!block) return;
    const node = editor.state.doc.nodeAt(block.pos);
    if (!node) return;
    const position = event.altKey ? block.pos : block.pos + node.nodeSize;
    editor
      .chain()
      .focus()
      .insertContentAt(position, { type: "paragraph" })
      .setTextSelection(position + 1)
      .insertContent("/")
      .run();
  };

  const deleteBlock = () => {
    if (!block) return;
    const node = editor.state.doc.nodeAt(block.pos);
    if (!node) return;
    editor
      .chain()
      .focus()
      .deleteRange({ from: block.pos, to: block.pos + node.nodeSize })
      .run();
  };

  /**
   * While the dropdown is open the handle must neither follow the pointer
   * nor hide — the drag-handle plugin exposes a lock via transaction meta.
   */
  const handleOpenChange = (open: boolean) => {
    if (editor.isDestroyed) return;
    editor.view.dispatch(editor.state.tr.setMeta("lockDragHandle", open));
  };

  /**
   * Highlights the whole hovered block while the pointer is anywhere over
   * it (the drag-handle plugin tracks the hover), so it's always clear
   * which node the gutter affects.
   */
  const highlightFrom = block?.pos ?? null;
  const highlightTo = block ? block.pos + block.node.nodeSize : null;
  useEffect(() => {
    if (editor.isDestroyed) return;
    setWikiGutterHighlight(
      editor,
      highlightFrom !== null && highlightTo !== null
        ? { from: highlightFrom, to: highlightTo }
        : null,
    );
  }, [editor, highlightFrom, highlightTo]);
  useEffect(() => {
    return () => setWikiGutterHighlight(editor, null);
  }, [editor]);

  return (
    <DragHandle
      editor={editor}
      computePositionConfig={COMPUTE_POSITION_CONFIG}
      onNodeChange={handleNodeChange}
    >
      <div className="flex items-center">
        <button
          type="button"
          title="Block darunter einfügen (Alt: darüber)"
          onClick={insertBlock}
          className={clsx(BUTTON_CLASS_NAME, "cursor-pointer")}
        >
          <FaPlus className="size-3" />
        </button>

        <PopoverBaseUI
          openOnHover={false}
          side="bottom"
          onOpenChange={handleOpenChange}
          trigger={
            <span
              title="Block verschieben oder bearbeiten"
              className={clsx(
                BUTTON_CLASS_NAME,
                "cursor-grab active:cursor-grabbing",
              )}
            >
              <MdDragIndicator className="size-4" />
            </span>
          }
        >
          <BlockActions editor={editor} block={block} />
        </PopoverBaseUI>

        <button
          type="button"
          title="Block löschen"
          onClick={deleteBlock}
          className={clsx(BUTTON_CLASS_NAME, "cursor-pointer")}
        >
          <FaTrash className="size-3" />
        </button>
      </div>
    </DragHandle>
  );
};

const ROW_CLASS_NAME =
  "flex cursor-pointer items-center gap-2 rounded-secondary px-2 py-1 text-left text-sm text-neutral-300 hover:bg-neutral-800";

interface BlockActionsProps {
  readonly editor: Editor;
  readonly block: HoveredBlock | null;
}

/**
 * Dropdown content of the gutter grip. Attributes are read fresh from the
 * document — the hovered snapshot can be stale after collab edits.
 */
const BlockActions = ({ editor, block }: BlockActionsProps) => {
  const { closePopover } = usePopoverBaseUI();

  if (!block) return null;
  const node = editor.state.doc.nodeAt(block.pos);
  if (node?.type.name !== block.node.type.name) return null;

  const deleteBlock = () => {
    closePopover();
    editor
      .chain()
      .focus()
      .deleteRange({ from: block.pos, to: block.pos + node.nodeSize })
      .run();
  };

  const toggleGridVerticalAlign = () => {
    closePopover();
    editor
      .chain()
      .command(({ tr }) => {
        tr.setNodeAttribute(
          block.pos,
          "verticalAlign",
          node.attrs.verticalAlign === "center" ? null : "center",
        );
        return true;
      })
      .run();
  };

  const setCalloutColor = (color: WikiCalloutColor) => {
    closePopover();
    editor
      .chain()
      .command(({ tr }) => {
        tr.setNodeAttribute(block.pos, "color", color);
        return true;
      })
      .run();
  };

  const removeCallout = () => {
    closePopover();
    editor
      .chain()
      .focus()
      .setTextSelection(block.pos + 2)
      .lift("wikiCallout")
      .run();
  };

  return (
    <div className="flex w-60 flex-col gap-1">
      {node.type.name === "wikiGrid" && (
        <button
          type="button"
          onClick={toggleGridVerticalAlign}
          className={clsx(ROW_CLASS_NAME, {
            "text-interaction-300": node.attrs.verticalAlign === "center",
          })}
        >
          <MdVerticalAlignCenter className="size-4 shrink-0" />
          Inhalte vertikal zentrieren
        </button>
      )}

      {node.type.name === "wikiCallout" && (
        <>
          <div className="flex items-center gap-1 px-2 py-1">
            <CalloutColorSwatches
              activeColor={(node.attrs.color ?? "blue") as WikiCalloutColor}
              onSelect={setCalloutColor}
            />
          </div>
          <button
            type="button"
            onClick={removeCallout}
            className={ROW_CLASS_NAME}
          >
            Hervorhebung entfernen
          </button>
        </>
      )}

      <button type="button" onClick={deleteBlock} className={ROW_CLASS_NAME}>
        <FaTrash className="size-3 shrink-0" />
        Block löschen
      </button>
    </div>
  );
};
