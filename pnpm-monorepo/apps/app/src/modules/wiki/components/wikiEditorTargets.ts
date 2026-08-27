"use client";

import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import {
  NodeSelection,
  TextSelection,
  type Transaction,
} from "@tiptap/pm/state";
import type { Editor } from "@tiptap/react";
import { useEffect, useState, type RefObject } from "react";
import {
  setWikiActiveNodeHighlight,
  WikiHighlightOwner,
  type WikiHighlightRange,
} from "./WikiActiveNodeHighlight";
import { onWikiBlockClick } from "./WikiBlockClick";

/**
 * Stable identity per target element: document positions shift under
 * remote collab edits and must not remount a menu (and reset a URL input
 * being typed in), so menu keys derive from the element instead. When a
 * transaction redraws the focused node, the target tracker hands the old
 * element's id to its replacement, so the key also survives redraws.
 */
let nextTargetId = 0;
const targetIds = new WeakMap<HTMLElement, number>();

export const wikiTargetKey = (element: HTMLElement): string => {
  let id = targetIds.get(element);
  if (id === undefined) {
    id = ++nextTargetId;
    targetIds.set(element, id);
  }
  return `element:${id}`;
};

/**
 * Nodes rendering their own content through a React node view (page index,
 * role members, variant chip). Everything inside them is generated per
 * viewer — paragraphs, lists, links, logos — and is not editor content, so
 * a click anywhere in them belongs to the node itself; otherwise each of
 * those elements would raise its own menu and resize handles for something
 * that cannot be edited or resized.
 */
const SELF_RENDERED_NODE_SELECTOR = [
  "[data-wiki-page-index]",
  "[data-wiki-role-citizens]",
  "[data-wiki-variant-link]",
].join(", ");

const liftToSelfRenderedNode = (element: HTMLElement): HTMLElement =>
  element.closest<HTMLElement>(SELF_RENDERED_NODE_SELECTOR) ?? element;

/**
 * Surfaces outside the editor content whose clicks must not clear the
 * focused block: the editing chrome (sticky toolbar, gutter controls) and
 * every portaled Base UI popup — the node configuration dialogs, the
 * link/embed dialogs and the suggestion popups all render as a dialog.
 */
const KEEP_FOCUS_SELECTOR = '[data-wiki-editor-chrome], [role="dialog"]';

/**
 * Resolves the node an element RENDERS — the one whose `nodeDOM` is that
 * element (or, for node views, contains it). Unlike
 * resolveWikiNodeFromElement it does not guess by node type, so container
 * blocks whose first child is itself a candidate type (a callout or quote
 * around a paragraph) resolve to the container instead of that child.
 * Returns NULL when the element renders no node of its own, e.g. a
 * mark-rendered link or a node view's inner markup that sits below the
 * node's own element.
 */
export const resolveWikiNodeByElement = (
  editor: Editor,
  element: HTMLElement,
): { position: number; node: ProseMirrorNode } | null => {
  let basePosition: number;
  try {
    basePosition = editor.view.posAtDOM(element, 0);
  } catch {
    return null;
  }

  const document = editor.state.doc;
  if (basePosition < 0 || basePosition > document.content.size) return null;
  const $base = document.resolve(basePosition);

  /**
   * posAtDOM answers with the position before the node for leafs and with
   * the one inside it for elements with content, hence the three
   * candidates — the third one covers content elements whose first child
   * starts further in (a callout's paragraph).
   */
  const candidates = [
    basePosition,
    basePosition - 1,
    $base.depth > 0 ? $base.before() : -1,
  ];

  for (const position of candidates) {
    if (position < 0 || position > document.content.size) continue;
    const node = document.nodeAt(position);
    if (!node) continue;
    const dom = editor.view.nodeDOM(position);
    if (
      dom instanceof HTMLElement &&
      (dom === element || dom.contains(element))
    )
      return { position, node };
  }

  return null;
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

/**
 * The document range of the block an element renders — the range washed
 * while it is hovered or focused. NULL for inline targets (mark-rendered
 * links), which get no wash.
 */
export const wikiBlockRange = (
  editor: Editor,
  element: HTMLElement,
): WikiHighlightRange | null => {
  const resolved = resolveWikiNodeByElement(editor, element);
  return resolved
    ? {
        from: resolved.position,
        to: resolved.position + resolved.node.nodeSize,
      }
    : null;
};

/**
 * The document range an element covers, block or inline: the block range
 * above, or the extent of a mark-rendered link's text.
 */
const wikiElementRange = (
  editor: Editor,
  element: HTMLElement,
): WikiHighlightRange | null => {
  const blockRange = wikiBlockRange(editor, element);
  if (blockRange) return blockRange;
  try {
    const from = editor.view.posAtDOM(element, 0);
    return { from, to: from + (element.textContent?.length ?? 0) };
  } catch {
    // posAtDOM throws on out-of-range positions
    return null;
  }
};

/**
 * Whether the selection has moved out of the focused element: arrow keys
 * leaving its block, a click into another one, or any non-empty text
 * selection — that one raises the formatting menu, which replaces the
 * block popover for good (collapsing it must not bring the old one back).
 */
const selectionLeftElement = (
  editor: Editor,
  element: HTMLElement,
): boolean => {
  const { selection } = editor.state;
  if (selection instanceof TextSelection && !selection.empty) return true;
  const range = wikiElementRange(editor, element);
  if (!range) return false;
  return selection.from < range.from || selection.to > range.to;
};

/**
 * Writes an owner's wash for a tracked element (see
 * WikiActiveNodeHighlight), NULL to remove it. Both washes re-assert
 * themselves after every transaction instead of trusting the decoration to
 * survive: a remote collab edit arrives as a rebuild of the whole
 * document, whose mapping collapses the tracked range. A detached element
 * is skipped — its node is being redrawn and the wash it already has still
 * fits.
 */
const washBlock = (
  editor: Editor,
  element: HTMLElement | null,
  owner: WikiHighlightOwner,
) => {
  if (element && !element.isConnected) return;
  setWikiActiveNodeHighlight(
    editor,
    element ? wikiBlockRange(editor, element) : null,
    owner,
  );
};

interface WikiTargetTracker {
  readonly element: HTMLElement | null;
  readonly set: (element: HTMLElement | null) => void;
  /** The tracked element after `transaction`, NULL when its node is gone */
  readonly follow: (transaction: Transaction) => HTMLElement | null;
}

/**
 * Keeps a tracked element anchored across redraws: markup changes (width
 * presets, alignment, heading level, …) make ProseMirror replace a node's
 * DOM element wholesale, which would otherwise drop the target — closing
 * the edit menu whose button just caused the change. The node counts as
 * redrawn (not gone) while a node with equal content sits at the mapped
 * position.
 */
const createWikiTargetTracker = (
  editor: Editor,
  selector: string,
): WikiTargetTracker => {
  let element: HTMLElement | null = null;
  /**
   * The tracked node's own position (nodeDOM(position) renders the
   * element, possibly through a wrapper), kept mapped through every
   * transaction. NULL when the element renders no node of its own
   * (mark-rendered links).
   */
  let position: number | null = null;

  const resolvePosition = (target: HTMLElement): number | null => {
    try {
      const base = editor.view.posAtDOM(target, 0);
      for (const candidate of [base, base - 1]) {
        if (candidate < 0) continue;
        const dom = editor.view.nodeDOM(candidate);
        if (
          dom === target ||
          (dom instanceof HTMLElement && dom.contains(target))
        )
          return candidate;
      }
    } catch {
      // posAtDOM throws on out-of-range positions
    }
    return null;
  };

  /** The element matching `selector` that renders the node at `candidate` */
  const elementAt = (candidate: number): HTMLElement | null => {
    const dom = editor.view.nodeDOM(candidate);
    const outer = dom instanceof HTMLElement ? dom : null;
    const match = outer?.matches(selector)
      ? outer
      : outer?.querySelector(selector);
    if (!(match instanceof HTMLElement) || !editor.view.dom.contains(match))
      return null;
    return liftToSelfRenderedNode(match);
  };

  const track = (next: HTMLElement | null) => {
    element = next;
    position = next ? resolvePosition(next) : null;
  };

  /** Carries the tracked element's menu identity over to its replacement */
  const inherit = (next: HTMLElement): HTMLElement => {
    const id = element ? targetIds.get(element) : undefined;
    if (id !== undefined && !targetIds.has(next)) targetIds.set(next, id);
    return next;
  };

  const follow = (transaction: Transaction): HTMLElement | null => {
    if (position === null) {
      /** Not re-anchorable — a detached element just loses the target */
      if (element && !element.isConnected) track(null);
      return element;
    }

    try {
      const previousNode = transaction.before.nodeAt(position);
      position = transaction.mapping.map(position);
      if (!element || element.isConnected) return element;

      const node = transaction.doc.nodeAt(position);
      const redrawn = elementAt(position);
      if (
        previousNode &&
        node &&
        previousNode.content.eq(node.content) &&
        redrawn
      ) {
        track(inherit(redrawn));
        return element;
      }

      /**
       * Commands that restructure a block instead of changing it (floating
       * an image, dropping it from the drag grip, replacing an embed's
       * URL) delete and re-create its node and select the result — that
       * selection is how they say "this is the same thing, rebuilt".
       */
      if (transaction.selectionSet) {
        const { selection } = transaction;
        const rebuilt =
          selection instanceof NodeSelection ? elementAt(selection.from) : null;
        if (rebuilt) {
          track(inherit(rebuilt));
          return element;
        }
      }
    } catch {
      // Stale positions must not break the dispatch chain
    }

    track(null);
    return null;
  };

  return {
    get element() {
      return element;
    },
    set: track,
    follow,
  };
};

/**
 * Washes the block under the pointer (WikiActiveNodeHighlight). Driven by
 * a single window mousemove listener instead of enter/leave boundary
 * events — React's synthetic mouseenter fires before native mouseleave
 * listeners, which would misorder show/hide. The wash survives while the
 * pointer is inside the overlay root (edit menu, resize handles), and
 * `lockRef` freezes it entirely (during a resize drag). Hover is the only
 * thing the pointer still drives: the popovers follow the focused block.
 */
export const useWikiHoverHighlight = (
  editor: Editor | null,
  selector: string,
  options: {
    readonly overlayRef: RefObject<HTMLElement | null>;
    readonly lockRef: RefObject<boolean>;
  },
) => {
  const { overlayRef, lockRef } = options;

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const editorDom = editor.view.dom;

    /**
     * The washed element. Only the pointer moves it — a redraw needs no
     * re-anchoring, because the wash is written from the element again on
     * every transaction.
     */
    let hovered: HTMLElement | null = null;

    const wash = (next: HTMLElement | null) => {
      hovered = next;
      washBlock(editor, next, WikiHighlightOwner.Hover);
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (lockRef.current) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (overlayRef.current?.contains(target)) return;

      const match = target.closest(selector);
      if (match instanceof HTMLElement && editorDom.contains(match)) {
        const next = liftToSelfRenderedNode(match);
        if (next !== hovered) wash(next);
        return;
      }

      if (hovered) wash(null);
    };

    const handleTransaction = () =>
      washBlock(editor, hovered, WikiHighlightOwner.Hover);

    window.addEventListener("mousemove", handleMouseMove);
    editor.on("transaction", handleTransaction);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      editor.off("transaction", handleTransaction);
      setWikiActiveNodeHighlight(editor, null, WikiHighlightOwner.Hover);
    };
  }, [editor, selector, overlayRef, lockRef]);
};

/**
 * The block whose contextual overlays (edit menu, resize handles) are
 * open. A click on a block focuses it, a second click on the same block
 * closes it again, and a click on another block switches over — one state
 * means one popover. Escape and clicks outside the editor clear it, and so
 * does a selection leaving the block, which covers arrow keys, Enter and
 * the deletion of the block itself. Typing inside it keeps it open.
 */
export const useWikiFocusedElement = (
  editor: Editor | null,
  selector: string,
  options: { readonly overlayRef: RefObject<HTMLElement | null> },
): HTMLElement | null => {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const { overlayRef } = options;

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const editorDom = editor.view.dom;
    const tracker = createWikiTargetTracker(editor, selector);

    const focus = (next: HTMLElement | null) => {
      tracker.set(next);
      setElement(next);
      washBlock(editor, next, WikiHighlightOwner.Focus);
    };

    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      const match = target instanceof Element ? target.closest(selector) : null;
      if (!(match instanceof HTMLElement) || !editorDom.contains(match)) {
        focus(null);
        return;
      }

      const next = liftToSelfRenderedNode(match);
      focus(next === tracker.element ? null : next);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && tracker.element) focus(null);
    };

    const handleMouseDown = (event: MouseEvent) => {
      if (!tracker.element) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      /** Clicks on the content are the click handler's business */
      if (editorDom.contains(target)) return;
      if (overlayRef.current?.contains(target)) return;
      if (target.closest(KEEP_FOCUS_SELECTOR)) return;
      focus(null);
    };

    const handleTransaction = ({
      transaction,
    }: {
      transaction: Transaction;
    }) => {
      const previous = tracker.element;
      if (!previous) return;
      const next = tracker.follow(transaction);
      if (next !== previous) focus(next);
      else washBlock(editor, next, WikiHighlightOwner.Focus);
    };

    /**
     * The leave rule listens for selection CHANGES, not for transactions:
     * ProseMirror applies a click's selection after its click handlers have
     * run, so a transaction dispatched from within them (the focus wash
     * above) still carries the selection of the previous block.
     */
    const handleSelectionUpdate = () => {
      const current = tracker.element;
      if (current && selectionLeftElement(editor, current)) focus(null);
    };

    const unsubscribeClick = onWikiBlockClick(editor, handleClick);
    editorDom.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousedown", handleMouseDown);
    editor.on("transaction", handleTransaction);
    editor.on("selectionUpdate", handleSelectionUpdate);
    return () => {
      unsubscribeClick();
      editorDom.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousedown", handleMouseDown);
      editor.off("transaction", handleTransaction);
      editor.off("selectionUpdate", handleSelectionUpdate);
      setWikiActiveNodeHighlight(editor, null, WikiHighlightOwner.Focus);
    };
  }, [editor, selector, overlayRef]);

  /**
   * A transaction can detach the element between two render ticks; the
   * tracker re-anchors (or clears) it right after.
   */
  return element?.isConnected ? element : null;
};
