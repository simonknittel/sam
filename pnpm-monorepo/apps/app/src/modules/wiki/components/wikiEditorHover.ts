"use client";

import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { Transaction } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/react";
import { useEffect, useState, type RefObject } from "react";

/**
 * Stable identity per hovered element: document positions shift under
 * remote collab edits and must not remount a menu (and reset a URL input
 * being typed in), so menu keys derive from the element instead. When a
 * transaction redraws the hovered node, useWikiHoveredElement hands the
 * old element's id to its replacement, so the key also survives redraws.
 */
let nextTargetId = 0;
const targetIds = new WeakMap<HTMLElement, number>();

export const wikiHoverTargetKey = (element: HTMLElement): string => {
  let id = targetIds.get(element);
  if (id === undefined) {
    id = ++nextTargetId;
    targetIds.set(element, id);
  }
  return `element:${id}`;
};

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

    /** Mirror of the state for the listeners below */
    let hovered: HTMLElement | null = null;
    /**
     * The hovered node's own position (nodeDOM(position) renders the
     * element, possibly via a wrapper), kept mapped through every
     * transaction so the hover can re-anchor after redraws. NULL when
     * the element has no such position (mark-rendered links).
     */
    let hoveredPosition: number | null = null;

    const setHovered = (next: HTMLElement | null) => {
      hovered = next;
      hoveredPosition = null;
      if (next) {
        try {
          const base = editor.view.posAtDOM(next, 0);
          for (const candidate of [base, base - 1]) {
            if (candidate < 0) continue;
            const dom = editor.view.nodeDOM(candidate);
            if (
              dom === next ||
              (dom instanceof HTMLElement && dom.contains(next))
            ) {
              hoveredPosition = candidate;
              break;
            }
          }
        } catch {
          // posAtDOM throws on out-of-range positions
        }
      }
      setElement(next);
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (lockRef.current) return;
      const target = event.target;
      if (!(target instanceof Element)) return;

      if (overlayRef.current?.contains(target)) return;

      const match = target.closest(selector);
      if (match instanceof HTMLElement && editorDom.contains(match)) {
        if (match !== hovered) setHovered(match);
        return;
      }

      if (hovered) setHovered(null);
    };

    /**
     * Typing dismisses the hover UI (e.g. the text menu floating over the
     * paragraph being written); the next mouse move brings it back.
     */
    const handleKeyDown = () => {
      if (lockRef.current) return;
      setHovered(null);
    };

    /**
     * Re-anchors the hover when a transaction redraws the hovered node:
     * markup changes (width presets, alignment, heading level, …) make
     * ProseMirror replace the node's DOM element wholesale, which would
     * otherwise drop the hover — closing the edit menu under the pointer
     * that just clicked one of its buttons. The node counts as redrawn
     * (not gone) while a node with equal content sits at the mapped
     * position; otherwise the hover clears like a mouse-out.
     */
    const handleTransaction = ({
      transaction,
    }: {
      transaction: Transaction;
    }) => {
      if (hoveredPosition === null) {
        // Not re-anchorable — a detached element just loses the hover
        if (hovered && !hovered.isConnected && !lockRef.current)
          setHovered(null);
        return;
      }

      try {
        const previousNode = transaction.before.nodeAt(hoveredPosition);
        hoveredPosition = transaction.mapping.map(hoveredPosition);
        if (!hovered || hovered.isConnected || lockRef.current) return;

        const node = transaction.doc.nodeAt(hoveredPosition);
        const dom = editor.view.nodeDOM(hoveredPosition);
        const outer = dom instanceof HTMLElement ? dom : null;
        const match = outer?.matches(selector)
          ? outer
          : (outer?.querySelector(selector) ?? null);

        if (
          !previousNode ||
          !node ||
          !previousNode.content.eq(node.content) ||
          !(match instanceof HTMLElement) ||
          !editorDom.contains(match)
        ) {
          setHovered(null);
          return;
        }

        const id = targetIds.get(hovered);
        if (id !== undefined && !targetIds.has(match)) targetIds.set(match, id);
        setHovered(match);
      } catch {
        // Stale positions must not break the dispatch chain
        setHovered(null);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    editorDom.addEventListener("keydown", handleKeyDown);
    editor.on("transaction", handleTransaction);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      editorDom.removeEventListener("keydown", handleKeyDown);
      editor.off("transaction", handleTransaction);
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
