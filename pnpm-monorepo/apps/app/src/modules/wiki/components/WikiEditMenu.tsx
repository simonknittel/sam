"use client";

import {
  autoUpdate,
  flip,
  offset,
  shift,
  useFloating,
} from "@floating-ui/react-dom";
import {
  WIKI_RESIZABLE_NODE_TYPES,
  type WikiCalloutColor,
  type WikiNodeAlignment,
} from "@sam-monorepo/wiki-editor";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { NodeSelection } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import type { Editor } from "@tiptap/react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  FaBan,
  FaCheck,
  FaDownload,
  FaExternalLinkAlt,
  FaTrash,
  FaUnlink,
} from "react-icons/fa";
import { MdDragIndicator } from "react-icons/md";
import { getWikiNodeTypeLabel } from "../utils/getWikiNodeTypeLabel";
import { ALIGNMENT_OPTIONS } from "./toolbar/AlignmentPicker";
import { CalloutColorSwatches } from "./toolbar/CalloutColorSwatches";
import {
  TEXT_FORMAT_OPTIONS,
  toggleWikiTextFormat,
} from "./toolbar/TextFormatPicker";
import { ToolbarButton } from "./toolbar/ToolbarButton";
import { ToolbarDivider } from "./toolbar/ToolbarDivider";
import {
  insertWikiEmbedFromUrl,
  insertWikiIframeFromUrl,
} from "./wikiEditorEmbeds";
import { resolveWikiNodeFromElement } from "./wikiEditorHover";

/** Node types with an editable src URL */
const URL_NODE_TYPES = ["youtube", "wikiEmbed", "wikiIframe"];
const MENU_NODE_TYPES = [
  ...URL_NODE_TYPES,
  "image",
  "wikiAttachment",
  "wikiPageLink",
  "wikiCitizenMention",
];

/**
 * Container and leaf blocks without node-specific actions — their menu
 * offers the shared drag handle and delete only, so every node type has
 * at least those two.
 */
const BLOCK_MENU_SELECTOR =
  "ul, ol, blockquote, pre, table, .tableWrapper, hr, details, [data-wiki-grid]";
const BLOCK_NODE_TYPES = [
  "bulletList",
  "orderedList",
  "taskList",
  "blockquote",
  "codeBlock",
  "table",
  "horizontalRule",
  "details",
  "wikiGrid",
];

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

/**
 * Stable identity per hovered element: document positions shift under
 * remote collab edits and must not remount a menu (and reset a URL input
 * being typed in), so the menu key derives from the element instead.
 */
let nextTargetId = 0;
const targetIds = new WeakMap<HTMLElement, number>();
const targetKey = (element: HTMLElement): string => {
  let id = targetIds.get(element);
  if (id === undefined) {
    id = ++nextTargetId;
    targetIds.set(element, id);
  }
  return `element:${id}`;
};

interface MenuTarget {
  /** Element the menu is anchored to (floating-ui reference) */
  readonly reference: HTMLElement;
  /** Remounts the menu (e.g. its URL input) when the target changes */
  readonly key: string;
}

type MenuState =
  | ({
      readonly kind: "node";
      readonly typeName: string;
      readonly position: number;
      readonly nodeSize: number;
      readonly src: string;
      readonly uploadId: string;
      readonly pageId: string;
      readonly citizenId: string;
      readonly align: WikiNodeAlignment;
    } & MenuTarget)
  | ({
      readonly kind: "link";
      readonly position: number;
      readonly href: string;
    } & MenuTarget)
  | ({
      readonly kind: "callout";
      readonly position: number;
      readonly color: WikiCalloutColor;
    } & MenuTarget)
  | ({
      readonly kind: "block";
      readonly typeName: string;
      readonly position: number;
      readonly nodeSize: number;
    } & MenuTarget)
  | ({
      readonly kind: "text";
      readonly position: number;
      readonly nodeSize: number;
      readonly headingLevel: number | null;
      readonly textAlign: WikiNodeAlignment;
      readonly activeMarks: readonly string[];
    } & MenuTarget)
  | null;

const nodeMenu = (
  node: ProseMirrorNode,
  position: number,
  target: MenuTarget,
): MenuState => ({
  kind: "node",
  typeName: node.type.name,
  position,
  nodeSize: node.nodeSize,
  src: String(node.attrs.src ?? ""),
  uploadId: String(node.attrs.uploadId ?? ""),
  pageId: String(node.attrs.pageId ?? ""),
  citizenId: String(node.attrs.citizenId ?? ""),
  align: (node.attrs.align ?? "left") as WikiNodeAlignment,
  ...target,
});

const calloutMenu = (
  node: ProseMirrorNode,
  position: number,
  target: MenuTarget,
): MenuState => ({
  kind: "callout",
  position,
  color: (node.attrs.color ?? "blue") as WikiCalloutColor,
  ...target,
});

/** Badge label naming the menu's target, e.g. "Tabelle" or "Überschrift 2" */
const menuLabel = (menu: NonNullable<MenuState>): string => {
  switch (menu.kind) {
    case "link":
      return "Link";
    case "callout":
      return getWikiNodeTypeLabel("wikiCallout");
    case "text":
      return getWikiNodeTypeLabel(
        menu.headingLevel === null ? "paragraph" : "heading",
        menu.headingLevel,
      );
    default:
      return getWikiNodeTypeLabel(menu.typeName);
  }
};

interface Props {
  readonly editor: Editor | null;
  /** Shared hover state, see WikiEditorOverlays */
  readonly hoveredElement: HTMLElement | null;
}

/**
 * Contextual edit menu centered above the hovered (or, on touch devices,
 * selected) element. Every block type gets at least the drag handle and a
 * delete button; on top of that: URL editing for embeds/iframes,
 * download/open for attachments and page links, link editing for the link
 * mark, text formatting for paragraphs/headings and color switching for
 * callouts. Companion of WikiResizeHandles inside the shared overlay root.
 */
export const WikiEditMenu = ({ editor, hoveredElement }: Props) => {
  const [menu, setMenu] = useState<MenuState>(null);

  const { refs, floatingStyles } = useFloating({
    placement: "top",
    strategy: "absolute",
    elements: { reference: menu?.reference ?? null },
    middleware: [
      offset(0),
      flip({ padding: { top: TOOLBAR_CLEARANCE, bottom: 8 } }),
      shift({ padding: 8 }),
    ],
    whileElementsMounted: autoUpdate,
  });

  useEffect(() => {
    if (!editor) return;

    const menuFromElement = (element: HTMLElement): MenuState => {
      const target: MenuTarget = {
        reference: element,
        key: targetKey(element),
      };

      /**
       * Plain links resolve through the mark, everything else through its
       * node type.
       */
      if (
        element.matches("a[href]") &&
        !element.matches(
          "[data-wiki-attachment], [data-wiki-page-link], [data-wiki-citizen-mention]",
        )
      ) {
        let position: number;
        try {
          position = editor.view.posAtDOM(element, 0);
        } catch {
          return null;
        }
        return {
          kind: "link",
          position,
          href: element.getAttribute("href") ?? "",
          ...target,
        };
      }

      if (element.matches("p, h1, h2, h3")) {
        const resolved = resolveWikiNodeFromElement(editor, element, [
          "paragraph",
          "heading",
        ]);
        if (!resolved) return null;
        const from = resolved.position + 1;
        const to = resolved.position + resolved.node.nodeSize - 1;
        const activeMarks = TEXT_FORMAT_OPTIONS.filter((option) => {
          const markType = editor.schema.marks[option.name];
          return markType
            ? editor.state.doc.rangeHasMark(from, to, markType)
            : false;
        }).map((option) => option.name);
        return {
          kind: "text",
          position: resolved.position,
          nodeSize: resolved.node.nodeSize,
          headingLevel:
            resolved.node.type.name === "heading"
              ? Number(resolved.node.attrs.level)
              : null,
          textAlign: (resolved.node.attrs.textAlign ??
            "left") as WikiNodeAlignment,
          activeMarks,
          ...target,
        };
      }

      if (element.matches("[data-wiki-callout]")) {
        const resolved = resolveWikiNodeFromElement(editor, element, [
          "wikiCallout",
        ]);
        if (!resolved) return null;
        return calloutMenu(resolved.node, resolved.position, target);
      }

      if (element.matches(BLOCK_MENU_SELECTOR)) {
        const resolved = resolveWikiNodeFromElement(
          editor,
          element,
          BLOCK_NODE_TYPES,
        );
        if (!resolved) return null;
        return {
          kind: "block",
          typeName: resolved.node.type.name,
          position: resolved.position,
          nodeSize: resolved.node.nodeSize,
          ...target,
        };
      }

      const resolved = resolveWikiNodeFromElement(
        editor,
        element,
        MENU_NODE_TYPES,
      );
      if (!resolved) return null;
      return nodeMenu(resolved.node, resolved.position, target);
    };

    const menuFromSelection = (): MenuState => {
      const { selection } = editor.state;

      if (
        selection instanceof NodeSelection &&
        MENU_NODE_TYPES.includes(selection.node.type.name)
      ) {
        const nodeDom = editor.view.nodeDOM(selection.from);
        if (!(nodeDom instanceof HTMLElement)) return null;
        return nodeMenu(selection.node, selection.from, {
          reference: nodeDom,
          key: `selection:${selection.from}`,
        });
      }

      if (editor.isActive("link")) {
        const domAtPos = editor.view.domAtPos(selection.from).node;
        const element =
          domAtPos instanceof HTMLElement ? domAtPos : domAtPos.parentElement;
        const linkDom = element?.closest("a[href]");
        if (!(linkDom instanceof HTMLElement)) return null;
        return {
          kind: "link",
          position: selection.from,
          href: String(editor.getAttributes("link").href ?? ""),
          reference: linkDom,
          key: `selection:${selection.from}`,
        };
      }

      if (selection.empty && editor.isActive("wikiCallout")) {
        const domAtPos = editor.view.domAtPos(selection.from).node;
        const element =
          domAtPos instanceof HTMLElement ? domAtPos : domAtPos.parentElement;
        const calloutDom = element?.closest("[data-wiki-callout]");
        if (!(calloutDom instanceof HTMLElement)) return null;
        const resolved = resolveWikiNodeFromElement(editor, calloutDom, [
          "wikiCallout",
        ]);
        if (!resolved) return null;
        return calloutMenu(resolved.node, resolved.position, {
          reference: calloutDom,
          key: `selection:${resolved.position}`,
        });
      }

      return null;
    };

    const update = () => {
      if (editor.isDestroyed) {
        setMenu(null);
        return;
      }

      const nextMenu =
        (hoveredElement ? menuFromElement(hoveredElement) : null) ??
        menuFromSelection();

      setMenu(nextMenu);
    };

    update();
    editor.on("transaction", update);
    return () => {
      editor.off("transaction", update);
    };
  }, [editor, hoveredElement]);

  if (!editor || !menu) return null;

  const deleteNode = () => {
    if (menu.kind !== "node") return;
    editor
      .chain()
      .focus()
      .deleteRange({ from: menu.position, to: menu.position + menu.nodeSize })
      .run();
  };

  const deleteTextBlock = () => {
    if (menu.kind !== "text") return;
    editor
      .chain()
      .focus()
      .deleteRange({ from: menu.position, to: menu.position + menu.nodeSize })
      .run();
  };

  const deleteBlock = () => {
    if (menu.kind !== "block") return;
    editor
      .chain()
      .focus()
      .deleteRange({ from: menu.position, to: menu.position + menu.nodeSize })
      .run();
  };

  /**
   * The callout menu state carries no nodeSize — read it fresh from the
   * document (which also guards against stale positions after collab
   * edits).
   */
  const deleteCallout = () => {
    if (menu.kind !== "callout") return;
    const node = editor.state.doc.nodeAt(menu.position);
    if (node?.type.name !== "wikiCallout") return;
    editor
      .chain()
      .focus()
      .deleteRange({ from: menu.position, to: menu.position + node.nodeSize })
      .run();
  };

  /**
   * Starts a native drag of the menu's node, mirroring what the gutter's
   * drag-handle plugin does for top-level blocks — unlike it, the menu
   * also reaches nodes nested inside grids, callouts and collapsible
   * sections. Selecting the node first is required: ProseMirror's drop
   * handler removes the current selection when `move` is set.
   */
  const startNodeDrag = (event: React.DragEvent<HTMLSpanElement>) => {
    if (menu.kind === "link") return;
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

  const openInNewTab = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const saveNodeUrl = (url: string) => {
    if (menu.kind !== "node") return;
    /**
     * Select the node first — the insert helpers replace the current
     * selection.
     */
    editor.commands.setNodeSelection(menu.position);
    if (menu.typeName === "wikiIframe") {
      void insertWikiIframeFromUrl(editor, url);
      return;
    }
    insertWikiEmbedFromUrl(editor, url);
  };

  const saveLink = (href: string) => {
    if (menu.kind !== "link") return;
    const trimmed = href.trim();
    try {
      const url = new URL(trimmed);
      if (url.protocol !== "https:" && url.protocol !== "http:")
        throw new Error("Unsupported protocol");
    } catch {
      toast.error("Bitte eine gültige URL angeben (https://…).");
      return;
    }
    editor
      .chain()
      .focus()
      .setTextSelection(menu.position + 1)
      .extendMarkRange("link")
      .setLink({ href: trimmed })
      .run();
  };

  const removeLink = () => {
    if (menu.kind !== "link") return;
    editor
      .chain()
      .focus()
      .setTextSelection(menu.position + 1)
      .extendMarkRange("link")
      .unsetLink()
      .run();
  };

  const setCalloutColor = (color: WikiCalloutColor) => {
    if (menu.kind !== "callout") return;
    editor
      .chain()
      .command(({ tr }) => {
        tr.setNodeAttribute(menu.position, "color", color);
        return true;
      })
      .run();
  };

  const setNodeAlignment = (value: WikiNodeAlignment) => {
    if (menu.kind !== "node") return;
    editor
      .chain()
      .command(({ tr }) => {
        tr.setNodeAttribute(
          menu.position,
          "align",
          value === "left" ? null : value,
        );
        return true;
      })
      .run();
  };

  const toggleTextHeading = (level: 1 | 2 | 3) => {
    if (menu.kind !== "text") return;
    editor
      .chain()
      .focus()
      .setTextSelection(menu.position + 1)
      .toggleHeading({ level })
      .run();
  };

  const toggleTextMark = (
    name: (typeof TEXT_FORMAT_OPTIONS)[number]["name"],
  ) => {
    if (menu.kind !== "text") return;
    toggleWikiTextFormat(
      editor
        .chain()
        .focus()
        .setTextSelection({
          from: menu.position + 1,
          to: menu.position + menu.nodeSize - 1,
        }),
      name,
    );
  };

  const setTextAlignment = (value: WikiNodeAlignment) => {
    if (menu.kind !== "text") return;
    editor
      .chain()
      .focus()
      .setTextSelection(menu.position + 1)
      .setTextAlign(value)
      .run();
  };

  const removeCallout = () => {
    if (menu.kind !== "callout") return;
    editor
      .chain()
      .focus()
      .setTextSelection(menu.position + 2)
      .lift("wikiCallout")
      .run();
  };

  const urlForm = (defaultValue: string, onSave: (url: string) => void) => (
    <form
      className="flex items-center gap-1"
      onSubmit={(event) => {
        event.preventDefault();
        const input = event.currentTarget.elements.namedItem("url");
        if (input instanceof HTMLInputElement) onSave(input.value);
      }}
    >
      <input
        name="url"
        type="url"
        required
        defaultValue={defaultValue}
        placeholder="https://…"
        className="w-56 rounded-secondary border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm focus-visible:outline-2 outline-interaction-700"
      />
      <ToolbarButton title="Übernehmen" isActive={false} type="submit">
        <FaCheck />
      </ToolbarButton>
    </form>
  );

  return (
    /**
     * The invisible vertical padding keeps the hover hit-area contiguous
     * with the target element (see WikiEditorOverlays) while creating the
     * visual gap.
     */
    <div
      key={menu.key}
      // eslint-disable-next-line react-hooks/refs -- floating-ui's refs.setFloating is a stable callback-ref setter, not a ref read
      ref={refs.setFloating}
      style={floatingStyles}
      className="pointer-events-auto z-20 py-2"
    >
      <div className="flex flex-col items-start gap-1">
        <span className="rounded-secondary border border-neutral-700 bg-neutral-900 px-2 py-0.5 text-xs whitespace-nowrap text-neutral-300 shadow-lg">
          {menuLabel(menu)}
        </span>

        <div className="flex items-center gap-1 rounded-secondary border border-neutral-700 bg-neutral-900 p-1 shadow-lg">
          {menu.kind !== "link" && (
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
            <>
              {URL_NODE_TYPES.includes(menu.typeName) &&
                urlForm(menu.src, saveNodeUrl)}

              {menu.typeName === "wikiAttachment" && (
                <ToolbarButton
                  title="Herunterladen"
                  isActive={false}
                  onClick={() =>
                    openInNewTab(
                      `/api/wiki/attachment/${encodeURIComponent(menu.uploadId)}`,
                    )
                  }
                >
                  <FaDownload />
                </ToolbarButton>
              )}

              {menu.typeName === "wikiPageLink" && (
                <ToolbarButton
                  title="Seite öffnen"
                  isActive={false}
                  onClick={() =>
                    openInNewTab(`/app/wiki/${encodeURIComponent(menu.pageId)}`)
                  }
                >
                  <FaExternalLinkAlt />
                </ToolbarButton>
              )}

              {menu.typeName === "wikiCitizenMention" && (
                <ToolbarButton
                  title="Spynet öffnen"
                  isActive={false}
                  onClick={() =>
                    openInNewTab(
                      `/app/spynet/citizen/${encodeURIComponent(menu.citizenId)}`,
                    )
                  }
                >
                  <FaExternalLinkAlt />
                </ToolbarButton>
              )}

              {URL_NODE_TYPES.includes(menu.typeName) && menu.src && (
                <ToolbarButton
                  title="In neuem Tab öffnen"
                  isActive={false}
                  onClick={() => openInNewTab(menu.src)}
                >
                  <FaExternalLinkAlt />
                </ToolbarButton>
              )}

              {(WIKI_RESIZABLE_NODE_TYPES as readonly string[]).includes(
                menu.typeName,
              ) &&
                ALIGNMENT_OPTIONS.map(({ value, title, icon: Icon }) => (
                  <ToolbarButton
                    key={value}
                    title={title}
                    isActive={menu.align === value}
                    onClick={() => setNodeAlignment(value)}
                  >
                    <Icon />
                  </ToolbarButton>
                ))}

              <ToolbarDivider />

              <ToolbarButton
                title="Löschen"
                isActive={false}
                onClick={deleteNode}
              >
                <FaTrash />
              </ToolbarButton>
            </>
          )}

          {menu.kind === "text" && (
            <>
              {([1, 2, 3] as const).map((level) => (
                <ToolbarButton
                  key={level}
                  title={`Überschrift ${level}`}
                  isActive={menu.headingLevel === level}
                  onClick={() => toggleTextHeading(level)}
                >
                  <span className="text-xs font-bold">H{level}</span>
                </ToolbarButton>
              ))}

              <ToolbarDivider />

              {TEXT_FORMAT_OPTIONS.map(({ name, title, icon: Icon }) => (
                <ToolbarButton
                  key={name}
                  title={title}
                  isActive={menu.activeMarks.includes(name)}
                  onClick={() => toggleTextMark(name)}
                >
                  <Icon />
                </ToolbarButton>
              ))}

              <ToolbarDivider />

              {ALIGNMENT_OPTIONS.map(({ value, title, icon: Icon }) => (
                <ToolbarButton
                  key={value}
                  title={title}
                  isActive={menu.textAlign === value}
                  onClick={() => setTextAlignment(value)}
                >
                  <Icon />
                </ToolbarButton>
              ))}

              <ToolbarDivider />

              <ToolbarButton
                title="Block löschen"
                isActive={false}
                onClick={deleteTextBlock}
              >
                <FaTrash />
              </ToolbarButton>
            </>
          )}

          {menu.kind === "link" && (
            <>
              {urlForm(menu.href, saveLink)}
              {menu.href && (
                <ToolbarButton
                  title="In neuem Tab öffnen"
                  isActive={false}
                  onClick={() => openInNewTab(menu.href)}
                >
                  <FaExternalLinkAlt />
                </ToolbarButton>
              )}

              <ToolbarButton
                title="Link entfernen"
                isActive={false}
                onClick={removeLink}
              >
                <FaUnlink />
              </ToolbarButton>
            </>
          )}

          {menu.kind === "callout" && (
            <>
              <CalloutColorSwatches
                activeColor={menu.color}
                onSelect={setCalloutColor}
              />
              <ToolbarButton
                title="Entfernen"
                isActive={false}
                onClick={removeCallout}
              >
                <FaBan />
              </ToolbarButton>

              <ToolbarDivider />

              <ToolbarButton
                title="Block löschen"
                isActive={false}
                onClick={deleteCallout}
              >
                <FaTrash />
              </ToolbarButton>
            </>
          )}

          {menu.kind === "block" && (
            <ToolbarButton
              title="Block löschen"
              isActive={false}
              onClick={deleteBlock}
            >
              <FaTrash />
            </ToolbarButton>
          )}
        </div>
      </div>
    </div>
  );
};
