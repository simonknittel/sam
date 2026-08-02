"use client";

import type { VirtualElement } from "@floating-ui/react-dom";
import {
  WIKI_HIGHLIGHT_COLORS,
  WIKI_TEXT_COLORS,
  getWikiPositionRestrictions,
  type WikiCalloutColor,
  type WikiGridVerticalAlign,
  type WikiHighlightColor,
  type WikiNodeAlignment,
  type WikiTextColor,
} from "@sam-monorepo/wiki-editor";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/react";
import { getWikiNodeTypeLabel } from "../../utils/getWikiNodeTypeLabel";
import { TEXT_FORMAT_OPTIONS } from "../toolbar/textFormats";
import type { WikiHighlightRange } from "../WikiActiveNodeHighlight";
import { resolveWikiNodeFromElement } from "../wikiEditorHover";

/** Node types with an editable src URL */
export const URL_NODE_TYPES = ["wikiEmbed"];
const MENU_NODE_TYPES = [
  ...URL_NODE_TYPES,
  "image",
  "wikiAttachment",
  "wikiPageLink",
  "wikiCitizenMention",
  "wikiVariantLink",
  "wikiPageIndex",
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

/** Text blocks with the hover-raised block menu and the selection-raised formatting menu */
const TEXT_MENU_NODE_TYPES = ["paragraph", "heading"];

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

/**
 * Floating-ui anchor for the text menu: horizontal bounds of the selected
 * text, vertical bounds of the whole block — the menu keeps its place
 * above the block but centers over the selection. Falls back to the block
 * when the range cannot be measured (positions gone stale between the
 * menu update and the measurement).
 */
const selectionAnchor = (
  editor: Editor,
  block: HTMLElement,
  from: number,
  to: number,
): VirtualElement => ({
  contextElement: block,
  getBoundingClientRect: () => {
    const blockRect = block.getBoundingClientRect();
    if (editor.isDestroyed) return blockRect;
    try {
      const start = editor.view.domAtPos(from);
      const end = editor.view.domAtPos(to);
      const range = document.createRange();
      range.setStart(start.node, start.offset);
      range.setEnd(end.node, end.offset);
      const selectionRect = range.getBoundingClientRect();
      if (selectionRect.width > 0)
        return new DOMRect(
          selectionRect.x,
          blockRect.y,
          selectionRect.width,
          blockRect.height,
        );
    } catch {
      // domAtPos throws on out-of-range positions
    }
    return blockRect;
  },
});

export interface WikiMenuTarget {
  /** Element or virtual element the menu is anchored to (floating-ui reference) */
  readonly reference: HTMLElement | VirtualElement;
  /** Remounts the menu (e.g. its URL input) when the target changes */
  readonly key: string;
}

export type WikiNodeMenuState = {
  readonly kind: "node";
  readonly typeName: string;
  readonly position: number;
  readonly nodeSize: number;
  readonly src: string;
  readonly uploadId: string;
  readonly pageId: string;
  readonly citizenId: string;
  readonly variantId: string;
  readonly align: WikiNodeAlignment;
  /** Raw attributes, e.g. for the page-index config dialog */
  readonly attrs: Readonly<Record<string, unknown>>;
} & WikiMenuTarget;

export type WikiLinkMenuState = {
  readonly kind: "link";
  readonly position: number;
  readonly href: string;
} & WikiMenuTarget;

export type WikiCalloutMenuState = {
  readonly kind: "callout";
  readonly position: number;
  readonly color: WikiCalloutColor;
} & WikiMenuTarget;

export type WikiBlockMenuState = {
  readonly kind: "block";
  readonly typeName: string;
  readonly position: number;
  readonly nodeSize: number;
  /** wikiGrid only: vertical alignment of the cell contents */
  readonly verticalAlign: WikiGridVerticalAlign;
} & WikiMenuTarget;

/** Formatting menu while text inside a single block is selected */
export type WikiTextSelectionMenuState = {
  readonly kind: "textSelection";
  readonly headingLevel: number | null;
  readonly activeMarks: readonly string[];
  readonly activeTextColor: WikiTextColor | null;
  readonly activeHighlightColor: WikiHighlightColor | null;
  /** Whether the selection carries a link mark (the link button prefills) */
  readonly hasLink: boolean;
} & WikiMenuTarget;

/** Block menu of the hovered (or whole-selected) paragraph/heading */
export type WikiTextNodeMenuState = {
  readonly kind: "textNode";
  readonly position: number;
  readonly nodeSize: number;
  readonly headingLevel: number | null;
  readonly textAlign: WikiNodeAlignment;
  /**
   * Paragraph inside a text-only container (quote, table cell, list
   * item): headings and alignment are unavailable there
   */
  readonly inTextOnlyBlock: boolean;
} & WikiMenuTarget;

export type WikiEditMenuState =
  | WikiNodeMenuState
  | WikiLinkMenuState
  | WikiCalloutMenuState
  | WikiBlockMenuState
  | WikiTextSelectionMenuState
  | WikiTextNodeMenuState
  | null;

const nodeMenu = (
  node: ProseMirrorNode,
  position: number,
  target: WikiMenuTarget,
): WikiEditMenuState => ({
  kind: "node",
  typeName: node.type.name,
  position,
  nodeSize: node.nodeSize,
  src: String(node.attrs.src ?? ""),
  uploadId: String(node.attrs.uploadId ?? ""),
  pageId: String(node.attrs.pageId ?? ""),
  citizenId: String(node.attrs.citizenId ?? ""),
  variantId: String(node.attrs.variantId ?? ""),
  align: (node.attrs.align ?? "left") as WikiNodeAlignment,
  attrs: node.attrs,
  ...target,
});

const calloutMenu = (
  node: ProseMirrorNode,
  position: number,
  target: WikiMenuTarget,
): WikiEditMenuState => ({
  kind: "callout",
  position,
  color: (node.attrs.color ?? "blue") as WikiCalloutColor,
  ...target,
});

const textHeadingLevel = (node: ProseMirrorNode): number | null =>
  node.type.name === "heading" ? Number(node.attrs.level) : null;

/**
 * Mark active states reflect the current selection (which the menu's
 * existence guarantees to be inside the block), not the whole block.
 */
const textSelectionMenu = (
  editor: Editor,
  node: ProseMirrorNode,
  target: WikiMenuTarget,
): WikiEditMenuState => ({
  kind: "textSelection",
  headingLevel: textHeadingLevel(node),
  activeMarks: TEXT_FORMAT_OPTIONS.filter((option) =>
    editor.schema.marks[option.name] ? editor.isActive(option.name) : false,
  ).map((option) => option.name),
  activeTextColor: editor.schema.marks.wikiTextColor
    ? (WIKI_TEXT_COLORS.find((color) =>
        editor.isActive("wikiTextColor", { color }),
      ) ?? null)
    : null,
  activeHighlightColor: editor.schema.marks.highlight
    ? (WIKI_HIGHLIGHT_COLORS.find((color) =>
        editor.isActive("highlight", { color }),
      ) ?? null)
    : null,
  hasLink: editor.schema.marks.link ? editor.isActive("link") : false,
  ...target,
});

const textNodeMenu = (
  editor: Editor,
  node: ProseMirrorNode,
  position: number,
  target: WikiMenuTarget,
): WikiEditMenuState => ({
  kind: "textNode",
  position,
  nodeSize: node.nodeSize,
  headingLevel: textHeadingLevel(node),
  textAlign: (node.attrs.textAlign ?? "left") as WikiNodeAlignment,
  inTextOnlyBlock: getWikiPositionRestrictions(editor.state.doc, position)
    .blocks,
  ...target,
});

/** The menu of a hovered element, or NULL when it has none */
export const wikiMenuFromElement = (
  editor: Editor,
  element: HTMLElement,
): WikiEditMenuState => {
  const target: WikiMenuTarget = {
    reference: element,
    key: targetKey(element),
  };

  /**
   * Everything inside a page index (its links and lists) resolves to
   * the index node itself — the node view's content is rendered by
   * React, not editor content.
   */
  const pageIndexDom = element.closest("[data-wiki-page-index]");
  if (pageIndexDom instanceof HTMLElement) {
    const resolved = resolveWikiNodeFromElement(editor, pageIndexDom, [
      "wikiPageIndex",
    ]);
    if (!resolved) return null;
    return nodeMenu(resolved.node, resolved.position, {
      reference: pageIndexDom,
      key: targetKey(pageIndexDom),
    });
  }

  /**
   * Plain links resolve through the mark, everything else through its
   * node type.
   */
  if (
    element.matches("a[href]") &&
    !element.matches(
      "[data-wiki-attachment], [data-wiki-page-link], [data-wiki-citizen-mention], [data-wiki-variant-link]",
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

  if (element.matches("[data-wiki-callout]")) {
    const resolved = resolveWikiNodeFromElement(editor, element, [
      "wikiCallout",
    ]);
    if (!resolved) return null;
    return calloutMenu(resolved.node, resolved.position, target);
  }

  if (element.matches("p, h1, h2, h3")) {
    const resolved = resolveWikiNodeFromElement(
      editor,
      element,
      TEXT_MENU_NODE_TYPES,
    );
    if (!resolved) return null;
    return textNodeMenu(editor, resolved.node, resolved.position, target);
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
      verticalAlign: (resolved.node.attrs.verticalAlign ??
        null) as WikiGridVerticalAlign,
      ...target,
    };
  }

  const resolved = resolveWikiNodeFromElement(editor, element, MENU_NODE_TYPES);
  if (!resolved) return null;
  return nodeMenu(resolved.node, resolved.position, target);
};

/** The menu the current selection raises, or NULL when it raises none */
export const wikiMenuFromSelection = (
  editor: Editor,
  editorBlurred: boolean,
): WikiEditMenuState => {
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

  /**
   * A text block's own NodeSelection (the gutter's drag handle
   * creates one on dragstart) also raises the block menu, so it
   * shows through and after such drags while the pointer is off the
   * document.
   */
  if (
    selection instanceof NodeSelection &&
    TEXT_MENU_NODE_TYPES.includes(selection.node.type.name)
  ) {
    const blockDom = editor.view.nodeDOM(selection.from);
    if (!(blockDom instanceof HTMLElement)) return null;
    return textNodeMenu(editor, selection.node, selection.from, {
      reference: blockDom,
      key: targetKey(blockDom),
    });
  }

  /**
   * Only a CARET inside a link raises the link menu (the touch fallback
   * for editing an existing link; deliberately blur-proof — focus moves
   * into its URL form while editing). A non-empty selection over a link
   * falls through to the formatting menu below, whose link button opens
   * the link dialog prefilled.
   */
  if (selection.empty && editor.isActive("link")) {
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

  /**
   * Text selected inside a single paragraph/heading raises the
   * formatting menu, centered horizontally over the selection while
   * keeping its vertical spot above the block. Selections spanning
   * several blocks get no menu — the menu's actions target one block.
   * A blurred editor gets none either: its selection survives the
   * blur, but focus has moved on (e.g. a click outside the editor).
   */
  if (
    !editorBlurred &&
    selection instanceof TextSelection &&
    !selection.empty &&
    selection.$from.sameParent(selection.$to) &&
    TEXT_MENU_NODE_TYPES.includes(selection.$from.parent.type.name)
  ) {
    const position = selection.$from.before();
    const blockDom = editor.view.nodeDOM(position);
    if (!(blockDom instanceof HTMLElement)) return null;
    return textSelectionMenu(editor, selection.$from.parent, {
      reference: selectionAnchor(
        editor,
        blockDom,
        selection.from,
        selection.to,
      ),
      key: targetKey(blockDom),
    });
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

/** Badge label naming the menu's target, e.g. "Tabelle" or "Überschrift 2" */
export const wikiMenuLabel = (menu: NonNullable<WikiEditMenuState>): string => {
  switch (menu.kind) {
    case "link":
      return "Link";
    case "callout":
      return getWikiNodeTypeLabel("wikiCallout");
    case "textSelection":
    case "textNode":
      return getWikiNodeTypeLabel(
        menu.headingLevel === null ? "paragraph" : "heading",
        menu.headingLevel,
      );
    default:
      return getWikiNodeTypeLabel(menu.typeName);
  }
};

/**
 * Block washed while its hover menu is up — the menu's own (deepest
 * hovered) node, so nested blocks win over their containers. Inline
 * targets (links) get no wash.
 */
export const wikiMenuHighlightRange = (
  editor: Editor,
  menu: NonNullable<WikiEditMenuState>,
): WikiHighlightRange | null => {
  switch (menu.kind) {
    case "node":
    case "block":
    case "textNode":
      return { from: menu.position, to: menu.position + menu.nodeSize };
    case "callout": {
      const node = editor.state.doc.nodeAt(menu.position);
      if (node?.type.name !== "wikiCallout") return null;
      return { from: menu.position, to: menu.position + node.nodeSize };
    }
    default:
      return null;
  }
};
