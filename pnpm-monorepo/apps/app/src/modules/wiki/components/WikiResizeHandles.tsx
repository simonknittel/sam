"use client";

import { autoUpdate } from "@floating-ui/react-dom";
import {
  clampWikiIframeHeightPx,
  clampWikiWidthPx,
  isWikiHeightResizable,
  WIKI_RESIZABLE_NODE_TYPES,
} from "@sam-monorepo/wiki-editor";
import { NodeSelection } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/react";
import { useEffect, useRef, useState, type RefObject } from "react";
import { resolveWikiNodeFromElement } from "./wikiEditorHover";

interface DragState {
  side: "left" | "right" | "bottom";
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  containerWidth: number;
  element: HTMLElement;
  /** Pending attribute value: widthPx (left/right) or heightPx (bottom) */
  value: number;
  position: number;
}

interface ResizeTarget {
  /** Document position of the node */
  readonly position: number;
  /** Whether the node gets the bottom height handle (generic iframe) */
  readonly heightResizable: boolean;
  /** Rect of the visual element, relative to the overlay */
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

interface Props {
  readonly editor: Editor | null;
  /** Shared hover state, see WikiEditorOverlays */
  readonly hoveredElement: HTMLElement | null;
  /** The overlay root — reference frame for the handle positions */
  readonly overlayRef: RefObject<HTMLDivElement | null>;
  /** Suppresses hover hiding while a resize drag is running */
  readonly setDragLock: (locked: boolean) => void;
}

/**
 * Drag handles on the edges of the hovered (or, on touch devices,
 * selected) resizable node: left/right for the width on all resizable
 * nodes, bottom for the height on the generic iframe. Dragging previews
 * the size on the DOM and commits it as `widthPx`/`heightPx` on
 * release. The hitboxes overlap the element's edges, so the pointer never
 * leaves the hover containment (see WikiEditorOverlays) on its way to a
 * handle.
 */
export const WikiResizeHandles = ({
  editor,
  hoveredElement,
  overlayRef,
  setDragLock,
}: Props) => {
  const [target, setTarget] = useState<ResizeTarget | null>(null);
  const dragStateRef = useRef<DragState | null>(null);

  useEffect(() => {
    if (!editor) return;
    let stopMeasuring: (() => void) | null = null;

    const update = () => {
      /**
       * While dragging, the DOM is updated imperatively — skip state
       * updates so the drag math keeps its reference frame.
       */
      if (dragStateRef.current) return;

      /**
       * A transaction that redraws the hovered node detaches the element;
       * the hover hook re-anchors (or clears) it right after — skip the
       * tick instead of flashing the handles away, the prop change re-runs
       * the update.
       */
      if (hoveredElement && !hoveredElement.isConnected) return;

      stopMeasuring?.();
      stopMeasuring = null;

      const overlay = overlayRef.current;
      if (!overlay || editor.isDestroyed) {
        setTarget(null);
        return;
      }

      /**
       * The hovered node wins; a node-selected node (tap on touch
       * devices) is the fallback. Nested blocks (grid cells, callouts,
       * collapsibles) get no handles — width only applies to direct
       * children of the document.
       */
      let resolved: { position: number; heightResizable: boolean } | null =
        null;
      let nodeDom: HTMLElement | null = null;

      if (hoveredElement) {
        const hovered = resolveWikiNodeFromElement(
          editor,
          hoveredElement,
          WIKI_RESIZABLE_NODE_TYPES,
        );
        if (hovered && editor.state.doc.resolve(hovered.position).depth === 0) {
          resolved = {
            position: hovered.position,
            heightResizable: isWikiHeightResizable(
              hovered.node.type.name,
              hovered.node.attrs.provider,
            ),
          };
          nodeDom = hoveredElement;
        }
      }

      if (!resolved) {
        const { selection } = editor.state;
        if (
          selection instanceof NodeSelection &&
          selection.$from.depth === 0 &&
          (WIKI_RESIZABLE_NODE_TYPES as readonly string[]).includes(
            selection.node.type.name,
          )
        ) {
          const dom = editor.view.nodeDOM(selection.from);
          if (dom instanceof HTMLElement) {
            resolved = {
              position: selection.from,
              heightResizable: isWikiHeightResizable(
                selection.node.type.name,
                selection.node.attrs.provider,
              ),
            };
            nodeDom = dom;
          }
        }
      }

      if (!resolved || !nodeDom) {
        setTarget(null);
        return;
      }

      const { position, heightResizable } = resolved;
      const element = nodeDom;

      const measure = () => {
        if (dragStateRef.current) return;
        const rect = element.getBoundingClientRect();
        const overlayRect = overlay.getBoundingClientRect();
        setTarget({
          position,
          heightResizable,
          left: rect.left - overlayRect.left,
          top: rect.top - overlayRect.top,
          width: rect.width,
          height: rect.height,
        });
      };

      /** Keeps the measured rect fresh on scroll, resize and layout shifts */
      stopMeasuring = autoUpdate(element, overlay, measure);
    };

    update();
    editor.on("transaction", update);
    return () => {
      stopMeasuring?.();
      editor.off("transaction", update);
    };
  }, [editor, hoveredElement, overlayRef]);

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
    if (side !== "bottom") {
      /**
       * Preview the margins the committed width will render (centered by
       * default), so the block re-centers live while dragging instead of
       * jumping into position on release.
       */
      const align: unknown = editor.state.doc.nodeAt(target.position)?.attrs
        .align;
      element.style.marginLeft = align === "left" ? "0" : "auto";
      element.style.marginRight = align === "right" ? "0" : "auto";
    }
    const startRect = element.getBoundingClientRect();
    dragStateRef.current = {
      side,
      startX: event.clientX,
      startY: event.clientY,
      startWidth: startRect.width,
      startHeight: startRect.height,
      containerWidth,
      element,
      value:
        side === "bottom"
          ? clampWikiIframeHeightPx(startRect.height)
          : Math.min(containerWidth, clampWikiWidthPx(startRect.width)),
      position: target.position,
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState) return;
      if (dragState.side === "bottom") {
        const height =
          dragState.startHeight + (moveEvent.clientY - dragState.startY);
        dragState.value = clampWikiIframeHeightPx(height);
        dragState.element.style.height = `${dragState.value}px`;
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
        dragState.element.style.width = `${dragState.value}px`;
      }

      const overlay = overlayRef.current;
      if (!overlay) return;
      const rect = dragState.element.getBoundingClientRect();
      const overlayRect = overlay.getBoundingClientRect();
      setTarget((previous) =>
        previous
          ? {
              ...previous,
              left: rect.left - overlayRect.left,
              top: rect.top - overlayRect.top,
              width: rect.width,
              height: rect.height,
            }
          : previous,
      );
    };

    const handlePointerUp = () => {
      const dragState = dragStateRef.current;
      dragStateRef.current = null;
      setDragLock(false);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      if (!dragState) return;

      editor
        .chain()
        .command(({ tr }) => {
          tr.setNodeAttribute(
            dragState.position,
            dragState.side === "bottom" ? "heightPx" : "widthPx",
            dragState.value,
          );
          return true;
        })
        .run();
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
