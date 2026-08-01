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
import { getWikiPositionRestrictions } from "@sam-monorepo/wiki-editor";
import { DragHandle } from "@tiptap/extension-drag-handle-react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { Editor } from "@tiptap/react";
import clsx from "clsx";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { FaPlus } from "react-icons/fa";
import { MdDragIndicator } from "react-icons/md";
import { setWikiGutterHighlight } from "./WikiActiveNodeHighlight";
import {
  WIKI_SLASH_COMMAND_ITEMS,
  type WikiSlashCommandItem,
} from "./WikiSlashCommand";

interface HoveredBlock {
  readonly node: ProseMirrorNode;
  readonly pos: number;
}

const BUTTON_CLASS_NAME =
  "flex size-5 items-center justify-center text-neutral-500 hover:text-interaction-500";

/**
 * Keeps the buttons in the gutter column: the drag-handle plugin anchors
 * to the hovered node's DOM box, so for centered or resized blocks
 * (images, embeds) the handle would follow the block's left edge into the
 * page. This shifts it back to the editor's content-box left edge (the
 * pl-12 gutter). The editor element is resolved through the floating
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
  /** Target for file uploads started from the insert palette */
  readonly pageId: string;
}

/**
 * Gutter controls left of the hovered top-level block: a plus button
 * opening the insert palette (new block below, Alt: above) and a grip
 * that only drags the block — all block actions live in the contextual
 * edit menu (WikiEditMenu).
 */
export const WikiGutter = ({ editor, pageId }: Props) => {
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

  /**
   * The Alt state must be captured when the popover opens — by the time
   * an entry is picked from the palette, the modifier is long released.
   */
  const insertAboveRef = useRef(false);
  const captureInsertAbove = (event: React.MouseEvent) => {
    insertAboveRef.current = event.altKey;
  };

  /**
   * While the insert palette is open the handle must neither follow the
   * pointer nor hide — the drag-handle plugin exposes a lock via
   * transaction meta.
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
        <PopoverBaseUI
          openOnHover={false}
          side="bottom"
          onOpenChange={handleOpenChange}
          trigger={
            <span
              title="Block darunter einfügen (Alt: darüber)"
              onClick={captureInsertAbove}
              className={clsx(BUTTON_CLASS_NAME, "cursor-pointer")}
            >
              <FaPlus className="size-3" />
            </span>
          }
        >
          <InsertBlockActions
            editor={editor}
            block={block}
            pageId={pageId}
            insertAboveRef={insertAboveRef}
          />
        </PopoverBaseUI>

        <span
          title="Block verschieben"
          className={clsx(
            BUTTON_CLASS_NAME,
            "cursor-grab active:cursor-grabbing",
          )}
        >
          <MdDragIndicator className="size-4" />
        </span>
      </div>
    </DragHandle>
  );
};

const ROW_CLASS_NAME =
  "flex cursor-pointer items-center gap-2 rounded-secondary px-2 py-1 text-left text-sm text-neutral-300 hover:bg-neutral-800";

interface InsertBlockActionsProps {
  readonly editor: Editor;
  readonly block: HoveredBlock | null;
  readonly pageId: string;
  readonly insertAboveRef: RefObject<boolean>;
}

/**
 * Dropdown content of the gutter plus button: the slash-command palette
 * as a click list. The document stays untouched until an entry is picked
 * — only then a paragraph is inserted next to the hovered block and the
 * palette action runs against it (the actions' leading deleteRange is a
 * no-op on the collapsed range), so dismissing the popover never leaves
 * an empty node behind.
 */
const InsertBlockActions = ({
  editor,
  block,
  pageId,
  insertAboveRef,
}: InsertBlockActionsProps) => {
  const { closePopover } = usePopoverBaseUI();

  if (!block) return null;
  const node = editor.state.doc.nodeAt(block.pos);
  if (node?.type.name !== block.node.type.name) return null;

  /**
   * The palette inserts next to the hovered block, i.e. into its parent —
   * for blocks nested in a text-only container (quote, table cell, list
   * item) only the text-level entries apply there, and inside a grid the
   * grid entries disappear (grids never nest).
   */
  const restrictions = getWikiPositionRestrictions(editor.state.doc, block.pos);
  const items = (
    restrictions.blocks
      ? WIKI_SLASH_COMMAND_ITEMS.filter((item) => item.allowedInTextOnlyBlock)
      : WIKI_SLASH_COMMAND_ITEMS
  ).filter((item) => !(restrictions.grids && item.insertsGrid));

  const insertBlock = (item: WikiSlashCommandItem) => {
    closePopover();
    /**
     * closePopover is a programmatic close — Base UI reports only its own
     * dismissals through onOpenChange, so the drag-handle lock has to be
     * released here.
     */
    editor.view.dispatch(editor.state.tr.setMeta("lockDragHandle", false));

    const position = insertAboveRef.current
      ? block.pos
      : block.pos + node.nodeSize;
    editor
      .chain()
      .focus()
      .insertContentAt(position, { type: "paragraph" })
      .setTextSelection(position + 1)
      .run();
    item.run(editor, { from: position + 1, to: position + 1 }, { pageId });
  };

  return (
    <div className="flex max-h-72 w-60 flex-col gap-1 overflow-y-auto">
      {items.map((item) => (
        <button
          key={item.title}
          type="button"
          onClick={() => insertBlock(item)}
          className={ROW_CLASS_NAME}
        >
          <span className="flex size-4 flex-none items-center justify-center">
            {item.icon}
          </span>
          {item.title}
        </button>
      ))}
    </div>
  );
};
