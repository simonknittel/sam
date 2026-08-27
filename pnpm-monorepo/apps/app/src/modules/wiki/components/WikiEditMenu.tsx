"use client";

import {
  autoUpdate,
  flip,
  offset,
  shift,
  useFloating,
} from "@floating-ui/react-dom";
import { NodeSelection } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import type { Editor } from "@tiptap/react";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { MdDragIndicator } from "react-icons/md";
import { WikiBlockMenuActions } from "./editMenu/WikiBlockMenuActions";
import { WikiCalloutMenuActions } from "./editMenu/WikiCalloutMenuActions";
import {
  wikiMenuFromElement,
  wikiMenuFromSelection,
  wikiMenuLabel,
  type WikiEditMenuState,
} from "./editMenu/wikiEditMenuState";
import { WikiLinkMenuActions } from "./editMenu/WikiLinkMenuActions";
import { WikiNodeMenuActions } from "./editMenu/WikiNodeMenuActions";
import { WikiTextNodeMenuActions } from "./editMenu/WikiTextNodeMenuActions";
import { WikiTextSelectionMenuActions } from "./editMenu/WikiTextSelectionMenuActions";
import { ToolbarDivider } from "./toolbar/ToolbarDivider";
import { WikiPageIndexConfigModal } from "./WikiPageIndexConfigModal";
import { WikiRoleCitizensConfigModal } from "./WikiRoleCitizensConfigModal";
import { WikiVariantLinkModal } from "./WikiVariantLinkModal";

/**
 * Viewport space reserved for the sticky editor toolbar — menus that would
 * reach into it flip below their target.
 */
const TOOLBAR_CLEARANCE = 56;

/**
 * `EditorView.dragging` is ProseMirror's documented imperative interface
 * for starting a drag from outside the editor DOM. The assignment lives in
 * a module-level helper because the react-hooks lint forbids mutating
 * prop-derived objects inside the component.
 */
const setViewDragging = (
  view: EditorView,
  dragging: EditorView["dragging"],
) => {
  view.dragging = dragging;
};

interface Props {
  readonly editor: Editor | null;
  /** Shared focused-block state, see WikiEditorOverlays */
  readonly focusedElement: HTMLElement | null;
  /** Opens the link dialog (selection menu's link button) */
  readonly onRequestLink: () => void;
}

/**
 * Contextual edit menu centered above its target. Clicking a block
 * focuses it and raises the menu — for embeds, media, links, callouts,
 * container blocks and text blocks, where it is the block menu
 * (headings, alignment). Text selected inside a single block raises the
 * formatting menu (marks, text color, highlight) centered over the
 * selection instead — exclusively: while the selection exists, no block
 * menu shows. Every block type gets at least a delete button, and all but
 * the formatting menu the drag handle; the per-kind actions live in
 * editMenu/. Companion of WikiResizeHandles inside the shared overlay
 * root.
 */
export const WikiEditMenu = ({
  editor,
  focusedElement,
  onRequestLink,
}: Props) => {
  const [menu, setMenu] = useState<WikiEditMenuState>(null);
  /**
   * ProseMirror keeps the selection — without dispatching a transaction —
   * when focus leaves the editor, so a click outside would leave the
   * formatting menu standing on the stale selection. A ref, not state:
   * the blur/focus handlers re-run the menu update themselves.
   */
  const editorBlurredRef = useRef(false);
  /**
   * Lifted out of the menu itself: the menu unmounts when its block loses
   * the focus, so the dialogs it opens must not live inside it.
   */
  const [nodeConfig, setNodeConfig] = useState<{
    readonly typeName: string;
    readonly position: number;
    readonly attrs: Readonly<Record<string, unknown>>;
  } | null>(null);
  const [variantLinkConfig, setVariantLinkConfig] = useState<{
    readonly position: number;
  } | null>(null);

  const {
    refs,
    floatingStyles,
    placement: resolvedPlacement,
  } = useFloating({
    /**
     * Block-level menus align with the block's left edge; the selection
     * and link menus center over their inline target.
     */
    placement:
      menu?.kind === "textSelection" || menu?.kind === "link"
        ? "top"
        : "top-start",
    strategy: "absolute",
    elements: { reference: menu?.reference ?? null },
    middleware: [
      offset(0),
      flip({ padding: { top: TOOLBAR_CLEARANCE, bottom: 8 } }),
      shift({ padding: 8 }),
    ],
    whileElementsMounted: autoUpdate,
  });
  /** The flip middleware moved the menu below its target */
  const flippedBelow = resolvedPlacement.startsWith("bottom");

  useEffect(() => {
    if (!editor) return;

    const update = () => {
      if (editor.isDestroyed) {
        setMenu(null);
        return;
      }

      /**
       * A transaction that redraws the focused node detaches the element;
       * the focus hook re-anchors (or clears) it right after — skip the
       * tick instead of flashing the menu closed, the prop change re-runs
       * the update.
       */
      if (focusedElement && !focusedElement.isConnected) return;

      const focusMenu = focusedElement
        ? wikiMenuFromElement(editor, focusedElement)
        : null;
      const selectionMenu = wikiMenuFromSelection(
        editor,
        editorBlurredRef.current,
      );

      /**
       * While text is selected, the formatting menu is exclusive — the
       * focused block gives up its own menu for it (and does not get it
       * back when the selection collapses, see useWikiFocusedElement).
       * Otherwise the focused block wins over the link menu.
       */
      setMenu(
        selectionMenu?.kind === "textSelection"
          ? selectionMenu
          : (focusMenu ?? selectionMenu),
      );
    };

    /**
     * Pressing a menu button moves focus onto it before its click lands,
     * blurring the editor — such blurs into the menu must not close it,
     * or the button would unmount under the pointer and swallow the
     * click. The button's command refocuses the editor afterwards. Only
     * the formatting menu closes on blur: it stands on a selection that
     * survives the blur, while the block menus stand on the focused
     * block, which a click outside the editor clears on its own.
     */
    const handleBlur = ({ event }: { event: FocusEvent }) => {
      if (
        event.relatedTarget instanceof Node &&
        refs.floating.current?.contains(event.relatedTarget)
      )
        return;
      editorBlurredRef.current = true;
      update();
    };
    const handleFocus = () => {
      editorBlurredRef.current = false;
      update();
    };

    // eslint-disable-next-line react-you-might-not-need-an-effect/no-external-store-subscription -- The tiptap editor is an imperative external store; its event API is the only way to mirror its state.
    update();
    editor.on("transaction", update);
    editor.on("blur", handleBlur);
    editor.on("focus", handleFocus);
    return () => {
      editor.off("transaction", update);
      editor.off("blur", handleBlur);
      editor.off("focus", handleFocus);
    };
  }, [editor, focusedElement, refs]);

  if (!editor) return null;

  const closeNodeConfig = () => setNodeConfig(null);
  const configModals = (
    <>
      {nodeConfig &&
        (nodeConfig.typeName === "wikiRoleCitizens" ? (
          <WikiRoleCitizensConfigModal
            editor={editor}
            position={nodeConfig.position}
            attrs={nodeConfig.attrs}
            onRequestClose={closeNodeConfig}
          />
        ) : (
          <WikiPageIndexConfigModal
            editor={editor}
            position={nodeConfig.position}
            attrs={nodeConfig.attrs}
            onRequestClose={closeNodeConfig}
          />
        ))}

      {variantLinkConfig && (
        <WikiVariantLinkModal
          editor={editor}
          position={variantLinkConfig.position}
          onRequestClose={() => setVariantLinkConfig(null)}
        />
      )}
    </>
  );

  /**
   * Starts a native drag of the menu's node, mirroring what the gutter's
   * drag-handle plugin does for top-level blocks — unlike it, the menu
   * also reaches nodes nested inside grids, callouts and collapsible
   * sections. Selecting the node first is required: ProseMirror's drop
   * handler removes the current selection when `move` is set.
   */
  const startNodeDrag = (event: React.DragEvent<HTMLSpanElement>) => {
    if (!menu || menu.kind === "link" || menu.kind === "textSelection") return;
    const { view } = editor;

    let selection: NodeSelection;
    try {
      selection = NodeSelection.create(view.state.doc, menu.position);
    } catch {
      return;
    }
    view.dispatch(view.state.tr.setSelection(selection));

    const slice = selection.content();
    const { dom, text } = view.serializeForClipboard(slice);
    event.dataTransfer.clearData();
    event.dataTransfer.setData("text/html", dom.innerHTML);
    event.dataTransfer.setData("text/plain", text);
    event.dataTransfer.effectAllowed = "copyMove";

    const nodeDom = view.nodeDOM(menu.position);
    if (nodeDom instanceof HTMLElement)
      event.dataTransfer.setDragImage(nodeDom, 0, 0);

    setViewDragging(view, { slice, move: true });
  };

  /**
   * The grip lives outside the editor DOM, so ProseMirror never sees its
   * dragend — clear the drag state explicitly (a cancelled drag would
   * otherwise leak into the next drop).
   */
  const endNodeDrag = () => {
    if (!editor.isDestroyed) setViewDragging(editor.view, null);
  };

  /**
   * The menu is rendered conditionally INSIDE this tree, never by
   * returning early: swapping the returned tree would move the dialogs to
   * another position and remount them — a dialog opened from the menu
   * must survive the menu closing when its block loses the focus.
   */
  return (
    <>
      {configModals}

      {/*
        Reversing the column when the menu flips below the target keeps
        the actions row the one facing it.
      */}
      {menu && (
        <div
          key={menu.key}
          // eslint-disable-next-line react-hooks/refs -- floating-ui's refs.setFloating is a stable callback-ref setter, not a ref read
          ref={refs.setFloating}
          style={floatingStyles}
          className="pointer-events-none z-20 py-2"
        >
          <div
            className={clsx("flex items-start gap-1", {
              "flex-col": !flippedBelow,
              "flex-col-reverse": flippedBelow,
            })}
          >
            <span className="rounded-secondary border border-neutral-700 bg-neutral-900 px-2 py-0.5 text-xs whitespace-nowrap text-neutral-300 shadow-lg">
              {wikiMenuLabel(menu)}
            </span>

            <div className="pointer-events-auto flex items-center gap-1 rounded-secondary border border-neutral-700 bg-neutral-900 p-1 shadow-lg">
              {menu.kind !== "link" && menu.kind !== "textSelection" && (
                <>
                  <span
                    draggable
                    title="Block verschieben"
                    onDragStart={startNodeDrag}
                    onDragEnd={endNodeDrag}
                    className="flex size-8 cursor-grab items-center justify-center rounded-secondary text-neutral-500 hover:bg-neutral-800 hover:text-neutral-200 active:cursor-grabbing"
                  >
                    <MdDragIndicator className="size-4" />
                  </span>

                  <ToolbarDivider />
                </>
              )}

              {menu.kind === "node" && (
                <WikiNodeMenuActions
                  editor={editor}
                  menu={menu}
                  onOpenNodeConfig={setNodeConfig}
                  onOpenVariantLink={setVariantLinkConfig}
                />
              )}
              {menu.kind === "textSelection" && (
                <WikiTextSelectionMenuActions
                  editor={editor}
                  menu={menu}
                  onRequestLink={onRequestLink}
                />
              )}
              {menu.kind === "textNode" && (
                <WikiTextNodeMenuActions editor={editor} menu={menu} />
              )}
              {menu.kind === "link" && (
                <WikiLinkMenuActions editor={editor} menu={menu} />
              )}
              {menu.kind === "callout" && (
                <WikiCalloutMenuActions editor={editor} menu={menu} />
              )}
              {menu.kind === "block" && (
                <WikiBlockMenuActions editor={editor} menu={menu} />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
