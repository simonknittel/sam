"use client";

import type { Editor } from "@tiptap/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { WikiEditMenu } from "./WikiEditMenu";
import { useWikiHoveredElement } from "./wikiEditorHover";
import {
  WIKI_OPEN_EMBED_MODAL_EVENT,
  WikiEmbedUrlModal,
} from "./WikiEmbedUrlModal";
import { WikiResizeHandles } from "./WikiResizeHandles";
import { WikiTableControls } from "./WikiTableControls";

/**
 * Everything the edit menu reacts to; the handles use a subset of it.
 * closest() picks the deepest match, so container blocks (lists, tables,
 * grids, …) only take the hover on their own chrome — their children keep
 * their more specific menus.
 */
const HOVER_SELECTOR = [
  "img",
  "[data-wiki-embed]",
  "[data-wiki-embed-blocked]",
  "a[data-wiki-attachment]",
  "a[data-wiki-page-link]",
  "a[data-wiki-citizen-mention]",
  "[data-wiki-page-index]",
  "a[href]",
  "[data-wiki-callout]",
  "p",
  "h1",
  "h2",
  "h3",
  "ul",
  "ol",
  "blockquote",
  "pre",
  "table",
  ".tableWrapper",
  "hr",
  "details",
  "[data-wiki-grid]",
].join(", ");

interface Props {
  readonly editor: Editor | null;
}

/**
 * Shares one hover state between the edit menu, the resize handles, the
 * table controls and the hover outline, so all of them appear and
 * disappear together. The overlay
 * root is the hover hook's containment boundary: the pointer may roam over
 * the menu's actions row and the handles (including the invisible hit-area
 * strips bridging the gaps to the element) without losing the hover;
 * anywhere else — including the menu's label row — hiding is immediate.
 */
export const WikiEditorOverlays = ({ editor }: Props) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const dragLockRef = useRef(false);
  const [embedModalOpen, setEmbedModalOpen] = useState(false);

  const hoveredElement = useWikiHoveredElement(editor, HOVER_SELECTOR, {
    overlayRef,
    lockRef: dragLockRef,
  });

  const setDragLock = useCallback((locked: boolean) => {
    dragLockRef.current = locked;
  }, []);

  /** The palettes' "Einbetten" entry requests the dialog, see openWikiEmbedModal */
  useEffect(() => {
    const open = () => setEmbedModalOpen(true);
    window.addEventListener(WIKI_OPEN_EMBED_MODAL_EVENT, open);
    return () => window.removeEventListener(WIKI_OPEN_EMBED_MODAL_EVENT, open);
  }, []);

  return (
    <div ref={overlayRef} className="pointer-events-none absolute inset-0">
      <WikiResizeHandles
        editor={editor}
        hoveredElement={hoveredElement}
        overlayRef={overlayRef}
        setDragLock={setDragLock}
      />
      <WikiTableControls
        editor={editor}
        hoveredElement={hoveredElement}
        overlayRef={overlayRef}
      />
      <WikiEditMenu editor={editor} hoveredElement={hoveredElement} />

      {editor && embedModalOpen && (
        <WikiEmbedUrlModal
          editor={editor}
          onRequestClose={() => setEmbedModalOpen(false)}
        />
      )}
    </div>
  );
};
