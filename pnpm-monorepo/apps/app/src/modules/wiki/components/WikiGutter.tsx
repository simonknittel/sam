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
import { FaPaste, FaPlus } from "react-icons/fa";
import { MdDragIndicator } from "react-icons/md";
import { getWikiNodeTypeLabel } from "../utils/getWikiNodeTypeLabel";
import { setWikiActiveNodeHighlight } from "./WikiActiveNodeHighlight";
import { getWikiCopiedBlock } from "./wikiBlockClipboard";
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
  /** Opens the embed URL dialog (palette entry "Einbetten") */
  readonly onRequestEmbed: () => void;
  /** Opens the link dialog (palette entry "Link") */
  readonly onRequestLink: () => void;
}

/**
 * Gutter controls left of the hovered top-level block: a plus button
 * opening the insert palette (new block below, Alt: above) and a grip
 * that only drags the block — all block actions live in the contextual
 * edit menu (WikiEditMenu).
 */
export const WikiGutter = ({
  editor,
  pageId,
  onRequestEmbed,
  onRequestLink,
}: Props) => {
  const [block, setBlock] = useState<HoveredBlock | null>(null);
  const [controlsHovered, setControlsHovered] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

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
    setPaletteOpen(open);
    if (editor.isDestroyed) return;
    editor.view.dispatch(editor.state.tr.setMeta("lockDragHandle", open));
  };

  /**
   * closePopover in the palette is a programmatic close — Base UI reports
   * only its own dismissals through onOpenChange, so the palette calls
   * this when an entry is picked.
   */
  const closePalette = () => {
    setPaletteOpen(false);
    if (editor.isDestroyed) return;
    editor.view.dispatch(editor.state.tr.setMeta("lockDragHandle", false));
  };

  /**
   * Highlights the gutter's block while the gutter is in use (pointer
   * over its controls or the insert palette open), so it's clear which
   * node it affects. Merely hovering block content washes the edit
   * menu's target instead — for nested content that is the inner block,
   * not this top-level one.
   */
  const gutterInUse = controlsHovered || paletteOpen;
  const highlightFrom = gutterInUse ? (block?.pos ?? null) : null;
  const highlightTo =
    gutterInUse && block ? block.pos + block.node.nodeSize : null;
  useEffect(() => {
    if (editor.isDestroyed) return;
    setWikiActiveNodeHighlight(
      editor,
      highlightFrom !== null && highlightTo !== null
        ? { from: highlightFrom, to: highlightTo }
        : null,
      "gutter",
    );
  }, [editor, highlightFrom, highlightTo]);
  useEffect(() => {
    return () => setWikiActiveNodeHighlight(editor, null, "gutter");
  }, [editor]);

  return (
    <DragHandle
      editor={editor}
      computePositionConfig={COMPUTE_POSITION_CONFIG}
      onNodeChange={handleNodeChange}
    >
      <div
        className="flex items-center"
        onMouseEnter={() => setControlsHovered(true)}
        onMouseLeave={() => setControlsHovered(false)}
      >
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
            onRequestEmbed={onRequestEmbed}
            onRequestLink={onRequestLink}
            insertAboveRef={insertAboveRef}
            onClosePalette={closePalette}
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
  readonly onRequestEmbed: () => void;
  readonly onRequestLink: () => void;
  readonly insertAboveRef: RefObject<boolean>;
  /** Releases the parent's palette state (lock, highlight) on insert */
  readonly onClosePalette: () => void;
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
  onRequestEmbed,
  onRequestLink,
  insertAboveRef,
  onClosePalette,
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

  /**
   * The copied block (edit menu's copy button, wikiBlockClipboard) obeys
   * the same placement rules as the palette entries: text-only containers
   * accept only paragraphs (or inline nodes, which get wrapped in one on
   * insert), and grids never nest.
   */
  const copied = getWikiCopiedBlock();
  const insertableCopied =
    copied &&
    (!restrictions.blocks ||
      copied.isInline ||
      copied.typeName === "paragraph") &&
    !(restrictions.grids && copied.containsGrid)
      ? copied
      : null;

  const insertPosition = () =>
    insertAboveRef.current ? block.pos : block.pos + node.nodeSize;

  const insertCopiedBlock = () => {
    if (!insertableCopied) return;
    closePopover();
    onClosePalette();

    editor
      .chain()
      .focus()
      .insertContentAt(
        insertPosition(),
        insertableCopied.isInline
          ? { type: "paragraph", content: [insertableCopied.content] }
          : insertableCopied.content,
      )
      .run();
  };

  const insertBlock = (item: WikiSlashCommandItem) => {
    closePopover();
    onClosePalette();

    const position = insertPosition();
    editor
      .chain()
      .focus()
      .insertContentAt(position, { type: "paragraph" })
      .setTextSelection(position + 1)
      .run();
    item.run(
      editor,
      { from: position + 1, to: position + 1 },
      { pageId, onRequestEmbed, onRequestLink },
    );
  };

  return (
    <div className="flex max-h-72 w-60 flex-col gap-1 overflow-y-auto">
      {insertableCopied && (
        <>
          <button
            type="button"
            onClick={insertCopiedBlock}
            className={ROW_CLASS_NAME}
          >
            <span className="flex size-4 flex-none items-center justify-center">
              <FaPaste />
            </span>
            <span className="flex flex-col items-start">
              Kopierten Block einfügen
              <span className="text-xs text-neutral-500">
                {getWikiNodeTypeLabel(
                  insertableCopied.typeName,
                  insertableCopied.headingLevel,
                )}
              </span>
            </span>
          </button>

          <div className="border-t border-neutral-800" />
        </>
      )}

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
