"use client";

import type { Editor } from "@tiptap/react";
import { useCallback, useRef } from "react";
import { WikiEditMenu } from "./WikiEditMenu";
import {
  useWikiFocusedElement,
  useWikiHoverHighlight,
} from "./wikiEditorTargets";
import { WikiResizeHandles } from "./WikiResizeHandles";
import { WikiTableControls } from "./WikiTableControls";

/**
 * Everything a click can focus; the hover wash uses the same list.
 * closest() picks the deepest match, so container blocks (lists, tables,
 * grids, …) only take the focus on their own chrome — their children keep
 * their more specific menus.
 */
const TARGET_SELECTOR = [
  "img",
  "[data-wiki-embed]",
  "[data-wiki-embed-blocked]",
  "a[data-wiki-attachment]",
  "a[data-wiki-page-link]",
  "a[data-wiki-citizen-mention]",
  "a[data-wiki-variant-link]",
  "[data-wiki-page-index]",
  "[data-wiki-role-citizens]",
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
  "hr",
  // The collapsible's node view renders a div, the static render a <details>
  "details",
  '[data-type="details"]',
  "[data-wiki-grid]",
].join(", ");

interface Props {
  readonly editor: Editor | null;
  /** Opens the link dialog (selection menu's link button) */
  readonly onRequestLink: () => void;
}

/**
 * Shares one focused-block state between the edit menu and the resize
 * handles, so both appear and disappear together; the table controls
 * follow the selection instead. The overlay root is the boundary both the
 * focus state and the hover wash treat as "not outside": the pointer may
 * roam over the menu's actions row and the handles without clearing
 * either.
 */
export const WikiEditorOverlays = ({ editor, onRequestLink }: Props) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const dragLockRef = useRef(false);

  const focusedElement = useWikiFocusedElement(editor, TARGET_SELECTOR, {
    overlayRef,
  });
  useWikiHoverHighlight(editor, TARGET_SELECTOR, {
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
        focusedElement={focusedElement}
        overlayRef={overlayRef}
        setDragLock={setDragLock}
      />
      <WikiTableControls editor={editor} overlayRef={overlayRef} />
      <WikiEditMenu
        editor={editor}
        focusedElement={focusedElement}
        onRequestLink={onRequestLink}
      />
    </div>
  );
};
