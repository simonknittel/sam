"use client";

import type { Editor } from "@tiptap/react";
import { useCallback, useRef } from "react";
import { WikiEditMenu } from "./WikiEditMenu";
import { useWikiHoveredElement } from "./wikiEditorHover";
import { WikiResizeHandles } from "./WikiResizeHandles";

/**
 * Everything the edit menu reacts to; the handles use a subset of it.
 * closest() picks the deepest match, so container blocks (lists, tables,
 * grids, …) only take the hover on their own chrome — their children keep
 * their more specific menus.
 */
const HOVER_SELECTOR = [
  "img",
  "[data-youtube-video]",
  "[data-wiki-embed]",
  "[data-wiki-embed-blocked]",
  "[data-wiki-iframe]",
  "a[data-wiki-attachment]",
  "a[data-wiki-page-link]",
  "a[data-wiki-citizen-mention]",
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
 * Shares one hover state between the edit menu, the resize handles and the
 * hover outline, so all of them appear and disappear together. The overlay
 * root is the hover hook's containment boundary: the pointer may roam over
 * the menu and the handles (including their invisible hit-area padding
 * bridging the gaps to the element) without losing the hover; anywhere
 * else, hiding is immediate.
 */
export const WikiEditorOverlays = ({ editor }: Props) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const dragLockRef = useRef(false);

  const hoveredElement = useWikiHoveredElement(editor, HOVER_SELECTOR, {
    overlayRef,
    lockRef: dragLockRef,
  });

  const setDragLock = useCallback((locked: boolean) => {
    dragLockRef.current = locked;
  }, []);

  return (
    <div ref={overlayRef} className="pointer-events-none absolute inset-0">
      <WikiResizeHandles
        editor={editor}
        hoveredElement={hoveredElement}
        overlayRef={overlayRef}
        setDragLock={setDragLock}
      />
      <WikiEditMenu editor={editor} hoveredElement={hoveredElement} />
    </div>
  );
};
