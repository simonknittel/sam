"use client";

import { autoUpdate } from "@floating-ui/react-dom";
import {
  clampWikiIframeHeightPx,
  clampWikiWidthPx,
  isWikiHeightResizable,
  WIKI_RESIZABLE_NODE_TYPES,
} from "@sam-monorepo/wiki-editor";
import type { Transaction } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/react";
import { useEffect, useRef, useState, type RefObject } from "react";
import { resolveWikiNodeByElement } from "./wikiEditorTargets";

interface DragState {
  readonly side: "left" | "right" | "bottom";
  readonly attribute: "widthPx" | "heightPx";
  readonly startX: number;
  readonly startY: number;
  readonly startWidth: number;
  readonly startHeight: number;
  readonly containerWidth: number;
  /** The attribute's value before the drag, restored for a single undo step */
  readonly startValue: unknown;
  /** Node position, mapped through transactions arriving mid-drag */
  position: number;
  /** Latest dragged value: widthPx (left/right) or heightPx (bottom) */
  value: number;
  /** Value already written to the document, NULL until the first write */
  writtenValue: number | null;
  /** Pending animation frame of the write, see writeDraggedValue */
  frame: number | null;
}

interface ResizeTarget {
  /** Document position of the node */
  readonly position: number;
  /** Whether the node gets the bottom height handle (generic iframe) */
  readonly heightResizable: boolean;
  /** Rect of the node's element, relative to the overlay */
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** Thickness of the visual handle bar (w-1.5/h-1.5) */
const HANDLE_WIDTH = 6;
/** Invisible hit-area padding around the bar (px-2/py-2) */
const HANDLE_HIT_PADDING = 8;
/** Gap between the element edge and the bar */
const HANDLE_GAP = 2;

/**
 * The resizable node at a position: width and position only apply to
 * direct children of the document, so nested blocks (grid cells, callout
 * and collapsible contents) have no handles. The floated image is the
 * exception — its width resizes against the paragraph it lives in (the
 * drag's container below), which is well-defined at any depth.
 */
const resizableNodeAt = (editor: Editor, position: number) => {
  if (position < 0 || position > editor.state.doc.content.size) return null;
  const node = editor.state.doc.nodeAt(position);
  if (!node) return null;
  if (node.type.name === "wikiFloatImage") return node;
  if (
    !(WIKI_RESIZABLE_NODE_TYPES as readonly string[]).includes(node.type.name)
  )
    return null;
  return editor.state.doc.resolve(position).depth === 0 ? node : null;
};

interface Props {
  readonly editor: Editor | null;
  /** Shared focused-block state, see WikiEditorOverlays */
  readonly focusedElement: HTMLElement | null;
  /** The overlay root — reference frame for the handle positions */
  readonly overlayRef: RefObject<HTMLDivElement | null>;
  /** Freezes the hover wash while a resize drag is running */
  readonly setDragLock: (locked: boolean) => void;
}

/**
 * Drag handles on the edges of the focused resizable node: left/right for
 * the width on all resizable nodes, bottom for the height on the generic
 * iframe.
 *
 * Dragging writes `widthPx`/`heightPx` to the document instead of
 * previewing the size on the DOM: ProseMirror owns the editor's DOM and
 * re-renders any node whose markup changed behind its back, which detached
 * the previewed element mid-drag and left the block at its old size until
 * the drag ended. Driven by the document, the block, the handles and the
 * focus highlight resize together — and remote editors see the drag live.
 */
export const WikiResizeHandles = ({
  editor,
  focusedElement,
  overlayRef,
  setDragLock,
}: Props) => {
  const [target, setTarget] = useState<ResizeTarget | null>(null);
  const dragStateRef = useRef<DragState | null>(null);

  useEffect(() => {
    if (!editor) return;
    let stopMeasuring: (() => void) | null = null;

    /**
     * The node's own element — the one carrying the width, which for node
     * views is their outer element (see wikiNodeViewElementAttributes) and
     * not the markup inside it. Looked up per use: an element does not
     * survive its node's redraws.
     */
    const nodeElement = (position: number): HTMLElement | null => {
      const dom = editor.view.nodeDOM(position);
      return dom instanceof HTMLElement ? dom : null;
    };

    const measure = (position: number, element: HTMLElement) => {
      const overlay = overlayRef.current;
      const node = resizableNodeAt(editor, position);
      if (!overlay || !node) {
        setTarget(null);
        return;
      }
      const rect = element.getBoundingClientRect();
      const overlayRect = overlay.getBoundingClientRect();
      setTarget({
        position,
        heightResizable: isWikiHeightResizable(
          node.type.name,
          node.attrs.provider,
        ),
        left: rect.left - overlayRect.left,
        top: rect.top - overlayRect.top,
        width: rect.width,
        height: rect.height,
      });
    };

    const update = () => {
      /**
       * While dragging, the dragged node stays the target wherever the
       * pointer is — it left the block for the handle.
       */
      const dragState = dragStateRef.current;
      if (dragState) {
        const element = nodeElement(dragState.position);
        if (element) measure(dragState.position, element);
        return;
      }

      /**
       * A transaction that redraws the focused node detaches the element;
       * the focus hook re-anchors (or clears) it right after — skip the
       * tick instead of flashing the handles away, the prop change re-runs
       * the update.
       */
      if (focusedElement && !focusedElement.isConnected) return;

      stopMeasuring?.();
      stopMeasuring = null;

      const overlay = overlayRef.current;
      if (!overlay || editor.isDestroyed) {
        setTarget(null);
        return;
      }

      const focused = focusedElement
        ? resolveWikiNodeByElement(editor, focusedElement)
        : null;
      const position =
        focused && resizableNodeAt(editor, focused.position)
          ? focused.position
          : null;

      const element = position === null ? null : nodeElement(position);
      if (position === null || !element) {
        setTarget(null);
        return;
      }

      /** Keeps the measured rect fresh on scroll, resize and layout shifts */
      stopMeasuring = autoUpdate(element, overlay, () => {
        if (dragStateRef.current) return;
        measure(position, element);
      });
    };

    const handleTransaction = ({
      transaction,
    }: {
      transaction: Transaction;
    }) => {
      const dragState = dragStateRef.current;
      if (dragState && transaction.docChanged)
        dragState.position = transaction.mapping.map(dragState.position);
      update();
    };

    // eslint-disable-next-line react-you-might-not-need-an-effect/no-external-store-subscription -- The tiptap editor is an imperative external store; its event API is the only way to mirror its state.
    update();
    editor.on("transaction", handleTransaction);
    return () => {
      stopMeasuring?.();
      editor.off("transaction", handleTransaction);
    };
  }, [editor, focusedElement, overlayRef]);

  const startDrag = (
    side: "left" | "right" | "bottom",
    event: React.PointerEvent,
  ) => {
    if (!editor || !target) return;
    const element = editor.view.nodeDOM(target.position);
    if (!(element instanceof HTMLElement)) return;
    const containerWidth =
      element.parentElement?.clientWidth ?? editor.view.dom.clientWidth;
    if (side !== "bottom" && containerWidth <= 0) return;

    event.preventDefault();
    setDragLock(true);
    const attribute = side === "bottom" ? "heightPx" : "widthPx";
    const nodeTypeName = editor.state.doc.nodeAt(target.position)?.type.name;
    const startRect = element.getBoundingClientRect();
    const dragState: DragState = {
      side,
      attribute,
      startX: event.clientX,
      startY: event.clientY,
      startWidth: startRect.width,
      startHeight: startRect.height,
      containerWidth,
      startValue: editor.state.doc.nodeAt(target.position)?.attrs[attribute],
      position: target.position,
      value:
        side === "bottom"
          ? clampWikiIframeHeightPx(startRect.height)
          : Math.min(containerWidth, clampWikiWidthPx(startRect.width)),
      writtenValue: null,
      frame: null,
    };
    dragStateRef.current = dragState;

    /**
     * Whether the dragged node is still there: a remote editor may delete
     * it mid-drag, and writing to its position would throw.
     */
    const isNodeGone = () =>
      editor.isDestroyed ||
      editor.state.doc.nodeAt(dragState.position)?.type.name !== nodeTypeName;

    /**
     * One write per frame: pointer moves arrive faster than the editor
     * re-renders, and every write is a transaction the collab session
     * syncs. They stay out of the undo history — the release below turns
     * the whole drag into a single undoable step.
     */
    const writeDraggedValue = () => {
      dragState.frame = null;
      if (dragStateRef.current !== dragState || isNodeGone()) return;
      if (dragState.value === dragState.writtenValue) return;
      dragState.writtenValue = dragState.value;
      editor.view.dispatch(
        editor.state.tr
          .setNodeAttribute(dragState.position, attribute, dragState.value)
          .setMeta("addToHistory", false),
      );
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (dragStateRef.current !== dragState) return;
      if (dragState.side === "bottom") {
        dragState.value = clampWikiIframeHeightPx(
          dragState.startHeight + (moveEvent.clientY - dragState.startY),
        );
      } else {
        const direction = dragState.side === "right" ? 1 : -1;
        const width =
          dragState.startWidth +
          (moveEvent.clientX - dragState.startX) * direction;
        /**
         * The stored width is absolute but never exceeds the content
         * column it was dragged in — narrower viewports cap it via the
         * attribute's max-width.
         */
        dragState.value = Math.min(
          dragState.containerWidth,
          clampWikiWidthPx(width),
        );
      }

      dragState.frame ??= window.requestAnimationFrame(writeDraggedValue);
    };

    const handlePointerUp = () => {
      dragStateRef.current = null;
      setDragLock(false);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      if (dragState.frame !== null)
        window.cancelAnimationFrame(dragState.frame);
      /** Never moved: nothing was written, so there is nothing to commit */
      if (dragState.writtenValue === null || isNodeGone()) return;

      /**
       * Rewind to the pre-drag value, then set the final one: both
       * dispatches run in this handler, so nothing renders in between and
       * the whole drag becomes ONE undo step instead of one per frame.
       */
      editor.view.dispatch(
        editor.state.tr
          .setNodeAttribute(dragState.position, attribute, dragState.startValue)
          .setMeta("addToHistory", false),
      );
      editor.view.dispatch(
        editor.state.tr.setNodeAttribute(
          dragState.position,
          attribute,
          dragState.value,
        ),
      );
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  if (!editor || !target) return null;

  const barHeight = Math.min(48, Math.max(24, target.height / 3));
  const barWidth = Math.min(48, Math.max(24, target.width / 3));
  const hitboxTop =
    target.top + target.height / 2 - barHeight / 2 - HANDLE_HIT_PADDING;
  const hitboxClassName =
    "group pointer-events-auto absolute flex cursor-ew-resize touch-none items-center px-2 py-2";
  const barClassName =
    "w-1.5 rounded-full bg-interaction-500 opacity-80 group-hover:opacity-100";

  return (
    <>
      <div
        role="separator"
        aria-label="Breite ändern"
        className={hitboxClassName}
        style={{
          left: target.left - HANDLE_GAP - HANDLE_WIDTH - HANDLE_HIT_PADDING,
          top: hitboxTop,
        }}
        onPointerDown={(event) => startDrag("left", event)}
      >
        <div className={barClassName} style={{ height: barHeight }} />
      </div>
      <div
        role="separator"
        aria-label="Breite ändern"
        className={hitboxClassName}
        style={{
          left: target.left + target.width + HANDLE_GAP - HANDLE_HIT_PADDING,
          top: hitboxTop,
        }}
        onPointerDown={(event) => startDrag("right", event)}
      >
        <div className={barClassName} style={{ height: barHeight }} />
      </div>
      {target.heightResizable && (
        <div
          role="separator"
          aria-label="Höhe ändern"
          className="group pointer-events-auto absolute flex cursor-ns-resize touch-none justify-center px-2 py-2"
          style={{
            left:
              target.left +
              target.width / 2 -
              barWidth / 2 -
              HANDLE_HIT_PADDING,
            top: target.top + target.height + HANDLE_GAP - HANDLE_HIT_PADDING,
          }}
          onPointerDown={(event) => startDrag("bottom", event)}
        >
          <div
            className="h-1.5 rounded-full bg-interaction-500 opacity-80 group-hover:opacity-100"
            style={{ width: barWidth }}
          />
        </div>
      )}
    </>
  );
};
