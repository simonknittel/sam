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
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { FaPlus, FaSearch } from "react-icons/fa";
import { MdDragIndicator } from "react-icons/md";
import {
  setWikiActiveNodeHighlight,
  WikiHighlightOwner,
} from "./WikiActiveNodeHighlight";
import {
  applyWikiUploadRestrictions,
  getWikiCopiedBlockItem,
  matchesWikiSlashCommandQuery,
  WIKI_SLASH_COMMAND_ITEMS,
  type WikiSlashCommandItem,
} from "./WikiSlashCommand";
import {
  WikiSuggestionMenu,
  type WikiSuggestionMenuHandle,
} from "./WikiSuggestionMenu";

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
  /** Whether the viewer may upload images to the page */
  readonly canUploadImages: boolean;
  /** Whether the viewer may upload file attachments to the page */
  readonly canUploadAttachments: boolean;
  /** Opens the embed URL dialog (palette entry "Einbetten") */
  readonly onRequestEmbed: () => void;
  /** Opens the link dialog (palette entry "Link") */
  readonly onRequestLink: () => void;
  /** Opens the ship picker (palette entry "Schiff") */
  readonly onRequestVariantLink: () => void;
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
  canUploadImages,
  canUploadAttachments,
  onRequestEmbed,
  onRequestLink,
  onRequestVariantLink,
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
   * node it affects. Merely hovering block content washes the hovered
   * block instead — for nested content that is the inner block, not this
   * top-level one.
   */
  const gutterInUse = controlsHovered || paletteOpen;
  const highlightFrom = gutterInUse ? (block?.pos ?? null) : null;
  const highlightTo =
    gutterInUse && block ? block.pos + block.node.nodeSize : null;
  useEffect(() => {
    // eslint-disable-next-line react-you-might-not-need-an-effect/no-event-handler -- The highlight lives in the imperative tiptap plugin state; the effect syncs the derived range into the editor.
    if (editor.isDestroyed) return;
    setWikiActiveNodeHighlight(
      editor,
      highlightFrom !== null && highlightTo !== null
        ? { from: highlightFrom, to: highlightTo }
        : null,
      WikiHighlightOwner.Gutter,
    );
  }, [editor, highlightFrom, highlightTo]);
  useEffect(() => {
    return () =>
      setWikiActiveNodeHighlight(editor, null, WikiHighlightOwner.Gutter);
  }, [editor]);

  return (
    <DragHandle
      editor={editor}
      computePositionConfig={COMPUTE_POSITION_CONFIG}
      onNodeChange={handleNodeChange}
    >
      {/* data-wiki-editor-chrome: clicks here keep the focused block */}
      <div
        data-wiki-editor-chrome
        className="flex items-center"
        onMouseEnter={() => setControlsHovered(true)}
        onMouseLeave={() => setControlsHovered(false)}
      >
        <PopoverBaseUI
          title="Block einfügen"
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
            canUploadImages={canUploadImages}
            canUploadAttachments={canUploadAttachments}
            onRequestEmbed={onRequestEmbed}
            onRequestLink={onRequestLink}
            onRequestVariantLink={onRequestVariantLink}
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

interface InsertBlockActionsProps {
  readonly editor: Editor;
  readonly block: HoveredBlock | null;
  readonly pageId: string;
  readonly canUploadImages: boolean;
  readonly canUploadAttachments: boolean;
  readonly onRequestEmbed: () => void;
  readonly onRequestLink: () => void;
  readonly onRequestVariantLink: () => void;
  readonly insertAboveRef: RefObject<boolean>;
  /** Releases the parent's palette state (lock, highlight) on insert */
  readonly onClosePalette: () => void;
}

/**
 * Dropdown content of the gutter plus button: the slash-command palette
 * with a filter input and keyboard navigation (shared WikiSuggestionMenu).
 * The document stays untouched until an entry is picked — only then a
 * paragraph is inserted next to the hovered block and the palette action
 * runs against it (the actions' leading deleteRange is a no-op on the
 * collapsed range), so dismissing the popover never leaves an empty node
 * behind.
 */
const InsertBlockActions = ({
  editor,
  block,
  pageId,
  canUploadImages,
  canUploadAttachments,
  onRequestEmbed,
  onRequestLink,
  onRequestVariantLink,
  insertAboveRef,
  onClosePalette,
}: InsertBlockActionsProps) => {
  const { closePopover } = usePopoverBaseUI();
  const [query, setQuery] = useState("");
  const menuRef = useRef<WikiSuggestionMenuHandle>(null);

  /**
   * Focus on mount, but without scrolling: the ref fires before Base UI
   * has positioned the popup (child effects run first), so a plain
   * autoFocus would scroll the page to the popup's initial (0,0)
   * position.
   */
  const focusInput = useCallback((input: HTMLInputElement | null) => {
    input?.focus({ preventScroll: true });
  }, []);

  /**
   * Memoized so unrelated gutter re-renders (hover state) keep the array
   * identity — WikiSuggestionMenu resets its keyboard selection whenever
   * the items identity changes (wanted only when the query changes).
   */
  const entries = useMemo(() => {
    if (!block) return [];

    /**
     * The palette inserts next to the hovered block, i.e. into its parent —
     * for blocks nested in a text-only container (quote, table cell, list
     * item) only the text-level entries apply there, and inside a grid the
     * grid entries disappear (grids never nest).
     */
    const restrictions = getWikiPositionRestrictions(
      editor.state.doc,
      block.pos,
    );
    const items = applyWikiUploadRestrictions(
      (restrictions.blocks
        ? WIKI_SLASH_COMMAND_ITEMS.filter((item) => item.allowedInTextOnlyBlock)
        : WIKI_SLASH_COMMAND_ITEMS
      ).filter((item) => !(restrictions.grids && item.insertsGrid)),
      { canUploadImages, canUploadAttachments },
    ).filter((item) => matchesWikiSlashCommandQuery(item, query));

    const copiedBlockItem = getWikiCopiedBlockItem(
      restrictions,
      query,
      items.length > 0,
    );
    return copiedBlockItem ? [copiedBlockItem, ...items] : items;
  }, [editor, block, query, canUploadImages, canUploadAttachments]);

  if (!block) return null;
  const node = editor.state.doc.nodeAt(block.pos);
  if (node?.type.name !== block.node.type.name) return null;

  const insertPosition = () =>
    insertAboveRef.current ? block.pos : block.pos + node.nodeSize;

  const insertBlock = (item: WikiSlashCommandItem) => {
    if (item.disabled === true) return;
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
      {
        pageId,
        canUploadImages,
        canUploadAttachments,
        onRequestEmbed,
        onRequestLink,
        onRequestVariantLink,
      },
    );
  };

  /** Arrow/Enter go to the list; everything else stays in the input */
  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (menuRef.current?.onKeyDown({ event: event.nativeEvent }) === true)
      event.preventDefault();
  };

  return (
    <div className="flex w-64 flex-col gap-2">
      <label className="relative block">
        <span className="sr-only">Blocktypen filtern</span>
        <FaSearch className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-neutral-500" />
        <input
          type="text"
          ref={focusInput}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder="Filtern …"
          className="w-full rounded-secondary border border-neutral-800 bg-neutral-900 py-1 pl-7 pr-2 text-sm outline-interaction-700 focus-visible:outline-2"
        />
      </label>

      <WikiSuggestionMenu items={entries} command={insertBlock} ref={menuRef} />
    </div>
  );
};
