"use client";

import { autoUpdate } from "@floating-ui/react-dom";
import {
  clampWikiIframeHeightPx,
  clampWikiWidthPercent,
  WIKI_HEIGHT_RESIZABLE_NODE_TYPES,
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
  /** Pending attribute value: widthPercent (left/right) or heightPx (bottom) */
  value: number;
  position: number;
}

interface ResizeTarget {
  /** Document position of the node */
  readonly position: number;
  readonly nodeTypeName: string;
  /** Rect of the visual element, relative to the overlay */
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/**
 * The element carrying the widthPercent inline style: the img itself, the
 * youtube iframe (the extension renders attributes onto it), or the
 * embed/iframe wrapper div.
 */
const getStyledElement = (
  nodeTypeName: string,
  nodeDom: HTMLElement,
): HTMLElement => {
  if (nodeTypeName === "youtube")
    return nodeDom.querySelector("iframe") ?? nodeDom;
  return nodeDom;
};

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
 * the size on the DOM and commits it as `widthPercent`/`heightPx` on
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

      stopMeasuring?.();
      stopMeasuring = null;

      const overlay = overlayRef.current;
      if (!overlay || editor.isDestroyed) {
        setTarget(null);
        return;
      }

      /**
       * The hovered node wins; a node-selected node (tap on touch
       * devices) is the fallback.
       */
      let resolved: { position: number; nodeTypeName: string } | null = null;
      let nodeDom: HTMLElement | null = null;

      if (hoveredElement) {
        const hovered = resolveWikiNodeFromElement(
          editor,
          hoveredElement,
          WIKI_RESIZABLE_NODE_TYPES,
        );
        if (hovered) {
          resolved = {
            position: hovered.position,
            nodeTypeName: hovered.node.type.name,
          };
          nodeDom = hoveredElement;
        }
      }

      if (!resolved) {
        const { selection } = editor.state;
        if (
          selection instanceof NodeSelection &&
          (WIKI_RESIZABLE_NODE_TYPES as readonly string[]).includes(
            selection.node.type.name,
          )
        ) {
          const dom = editor.view.nodeDOM(selection.from);
          if (dom instanceof HTMLElement) {
            resolved = {
              position: selection.from,
              nodeTypeName: selection.node.type.name,
            };
            nodeDom = dom;
          }
        }
      }

      if (!resolved || !nodeDom) {
        setTarget(null);
        return;
      }

      const { position, nodeTypeName } = resolved;
      const element = getStyledElement(nodeTypeName, nodeDom);

      const measure = () => {
        if (dragStateRef.current) return;
        const rect = element.getBoundingClientRect();
        const overlayRect = overlay.getBoundingClientRect();
        setTarget({
          position,
          nodeTypeName,
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
    const nodeDom = editor.view.nodeDOM(target.position);
    if (!(nodeDom instanceof HTMLElement)) return;
    const element = getStyledElement(target.nodeTypeName, nodeDom);
    const containerWidth =
      element.parentElement?.clientWidth ?? editor.view.dom.clientWidth;
    if (side !== "bottom" && containerWidth <= 0) return;

    event.preventDefault();
    setDragLock(true);
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
          : clampWikiWidthPercent((startRect.width / containerWidth) * 100),
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
        dragState.value = clampWikiWidthPercent(
          (width / dragState.containerWidth) * 100,
        );
        dragState.element.style.width = `${dragState.value}%`;
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
            dragState.side === "bottom" ? "heightPx" : "widthPercent",
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

  const heightResizable = (
    WIKI_HEIGHT_RESIZABLE_NODE_TYPES as readonly string[]
  ).includes(target.nodeTypeName);

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
      {heightResizable && (
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
