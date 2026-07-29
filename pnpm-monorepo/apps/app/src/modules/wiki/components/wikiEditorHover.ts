"use client";

import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { Editor } from "@tiptap/react";
import { useEffect, useState, type RefObject } from "react";

/**
 * Tracks which element matching `selector` the pointer is over inside the
 * editor. Driven by a single window mousemove listener instead of
 * enter/leave boundary events — React's synthetic mouseenter fires before
 * native mouseleave listeners, which would misorder show/hide. Hiding is
 * immediate; the hover only survives while the pointer is inside the
 * overlay root (menu, handles — their invisible hit-area padding bridges
 * the gaps to the element, so there is no dead corridor to cross).
 * `lockRef` suppresses all changes (e.g. during a resize drag). Touch
 * devices don't hover — there the selection-based fallbacks of the
 * consumers apply.
 */
export const useWikiHoveredElement = (
  editor: Editor | null,
  selector: string,
  options: {
    readonly overlayRef: RefObject<HTMLElement | null>;
    readonly lockRef: RefObject<boolean>;
  },
): HTMLElement | null => {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const { overlayRef, lockRef } = options;

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const editorDom = editor.view.dom;

    const handleMouseMove = (event: MouseEvent) => {
      if (lockRef.current) return;
      const target = event.target;
      if (!(target instanceof Element)) return;

      if (overlayRef.current?.contains(target)) return;

      const match = target.closest(selector);
      if (match instanceof HTMLElement && editorDom.contains(match)) {
        setElement(match);
        return;
      }

      setElement(null);
    };

    /**
     * Typing dismisses the hover UI (e.g. the text menu floating over the
     * paragraph being written); the next mouse move brings it back.
     */
    const handleKeyDown = () => {
      if (lockRef.current) return;
      setElement(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    editorDom.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      editorDom.removeEventListener("keydown", handleKeyDown);
    };
  }, [editor, selector, overlayRef, lockRef]);

  /**
   * Transactions can re-render the node and detach the hovered element.
   */
  return element?.isConnected ? element : null;
};

/**
 * Resolves the document node a rendered element belongs to. posAtDOM
 * returns the position inside the parent for leafs and the position before
 * the first child for elements with content — checking both candidates
 * covers node wrappers and bare leaf elements alike.
 */
export const resolveWikiNodeFromElement = (
  editor: Editor,
  element: HTMLElement,
  nodeTypeNames: readonly string[],
): { position: number; node: ProseMirrorNode } | null => {
  let basePosition: number;
  try {
    basePosition = editor.view.posAtDOM(element, 0);
  } catch {
    return null;
  }

  const document = editor.state.doc;
  for (const position of [basePosition, basePosition - 1]) {
    if (position < 0 || position > document.content.size) continue;
    const node = document.nodeAt(position);
    if (node && nodeTypeNames.includes(node.type.name))
      return { position, node };
  }

  return null;
};
