"use client";

import type { VirtualElement } from "@floating-ui/react-dom";
import {
  WIKI_HIGHLIGHT_COLORS,
  WIKI_TEXT_COLORS,
  getWikiPositionRestrictions,
  getWikiSelectionRestrictions,
  type WikiCalloutColor,
  type WikiGridVerticalAlign,
  type WikiHighlightColor,
  type WikiNodeAlignment,
  type WikiTextColor,
  type WikiTextSize,
} from "@sam-monorepo/wiki-editor";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { TextSelection } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/react";
import { getWikiNodeTypeLabel } from "../../utils/getWikiNodeTypeLabel";
import { TEXT_FORMAT_OPTIONS } from "../toolbar/textFormats";
import {
  resolveWikiNodeFromElement,
  wikiTargetKey,
} from "../wikiEditorTargets";

/** Node types with an editable src URL */
export const URL_NODE_TYPES = ["wikiEmbed"];
const MENU_NODE_TYPES = [
  ...URL_NODE_TYPES,
  "image",
  "wikiFloatImage",
  "wikiAttachment",
  "wikiPageLink",
  "wikiCitizenMention",
  "wikiVariantLink",
  "wikiPageIndex",
  "wikiRoleCitizens",
];

/** Nodes whose menu offers a config dialog (mounted by WikiEditMenu) */
export const CONFIGURABLE_NODE_TYPES = ["wikiPageIndex", "wikiRoleCitizens"];

/**
 * Container and leaf blocks without node-specific actions — their menu
 * offers the shared drag handle and delete only, so every node type has
 * at least those two.
 */
const BLOCK_MENU_SELECTOR =
  'ul, ol, blockquote, pre, table, hr, details, [data-type="details"], [data-wiki-grid]';
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

/** Text blocks with the click-raised block menu and the selection-raised formatting menu */
const TEXT_MENU_NODE_TYPES = ["paragraph", "heading"];

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

interface WikiMenuTarget {
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
  readonly widthPx: number | null;
  /** Width/position only apply to direct children of the document */
  readonly topLevel: boolean;
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
  readonly align: WikiNodeAlignment;
  readonly widthPx: number | null;
  /** Width/position only apply to direct children of the document */
  readonly topLevel: boolean;
} & WikiMenuTarget;

export type WikiBlockMenuState = {
  readonly kind: "block";
  readonly typeName: string;
  readonly position: number;
  readonly nodeSize: number;
  /** wikiGrid only: vertical alignment of the cell contents */
  readonly verticalAlign: WikiGridVerticalAlign;
  /** Lists only: block-level text size of the whole list */
  readonly textSize: WikiTextSize | null;
  readonly align: WikiNodeAlignment;
  readonly widthPx: number | null;
  /** Width/position only apply to direct children of the document */
  readonly topLevel: boolean;
} & WikiMenuTarget;

/** Formatting menu while text inside a single block is selected */
export type WikiTextSelectionMenuState = {
  readonly kind: "textSelection";
  readonly headingLevel: number | null;
  readonly activeMarks: readonly string[];
  readonly activeTextColor: WikiTextColor | null;
  readonly activeHighlightColor: WikiHighlightColor | null;
  /**
   * The block is already small, so the inline small-text mark would only
   * compound — its button is shown disabled
   */
  readonly smallTextUnavailable: boolean;
  /** Whether the selection carries a link mark (the link button prefills) */
  readonly hasLink: boolean;
} & WikiMenuTarget;

/** Block menu of the focused paragraph/heading */
export type WikiTextNodeMenuState = {
  readonly kind: "textNode";
  readonly position: number;
  readonly nodeSize: number;
  readonly headingLevel: number | null;
  /** Paragraphs only: NULL for headings and for the normal size */
  readonly textSize: WikiTextSize | null;
  readonly textAlign: WikiNodeAlignment;
  readonly align: WikiNodeAlignment;
  readonly widthPx: number | null;
  /** Width/position only apply to direct children of the document */
  readonly topLevel: boolean;
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

/** Width/position only apply to direct children of the document */
const isTopLevel = (editor: Editor, position: number): boolean =>
  editor.state.doc.resolve(position).depth === 0;

/**
 * The menu's width value: a pixel number, or NULL for full width (both
 * the explicit WIKI_FULL_WIDTH marker and the stripped/legacy NULL).
 */
const menuWidthPx = (node: ProseMirrorNode): number | null => {
  const value: unknown = node.attrs.widthPx;
  return typeof value === "number" ? value : null;
};

const nodeMenu = (
  editor: Editor,
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
  align: (node.attrs.align ?? "center") as WikiNodeAlignment,
  widthPx: menuWidthPx(node),
  topLevel: isTopLevel(editor, position),
  attrs: node.attrs,
  ...target,
});

const calloutMenu = (
  editor: Editor,
  node: ProseMirrorNode,
  position: number,
  target: WikiMenuTarget,
): WikiEditMenuState => ({
  kind: "callout",
  position,
  color: (node.attrs.color ?? "blue") as WikiCalloutColor,
  align: (node.attrs.align ?? "center") as WikiNodeAlignment,
  widthPx: menuWidthPx(node),
  topLevel: isTopLevel(editor, position),
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
  smallTextUnavailable: getWikiSelectionRestrictions(editor.state).smallText,
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
  textSize: (node.attrs.textSize ?? null) as WikiTextSize | null,
  textAlign: (node.attrs.textAlign ?? "left") as WikiNodeAlignment,
  align: (node.attrs.align ?? "center") as WikiNodeAlignment,
  widthPx: menuWidthPx(node),
  topLevel: isTopLevel(editor, position),
  inTextOnlyBlock: getWikiPositionRestrictions(editor.state.doc, position)
    .blocks,
  ...target,
});

/**
 * The menu of the focused element, or NULL when it has none. Nodes
 * rendering their own content (page index, role members, …) arrive as their
 * node-view root — the focus never points inside them, see
 * useWikiFocusedElement — and fall through to the node menu below.
 */
export const wikiMenuFromElement = (
  editor: Editor,
  element: HTMLElement,
): WikiEditMenuState => {
  const target: WikiMenuTarget = {
    reference: element,
    key: wikiTargetKey(element),
  };

  /**
   * Plain links resolve through the mark, everything else through its
   * node type.
   */
  if (
    element.matches("a[href]") &&
    !element.matches(
      "[data-wiki-image], [data-wiki-float-image], [data-wiki-attachment], [data-wiki-page-link], [data-wiki-citizen-mention], [data-wiki-variant-link]",
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
    return calloutMenu(editor, resolved.node, resolved.position, target);
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
      textSize: (resolved.node.attrs.textSize ?? null) as WikiTextSize | null,
      align: (resolved.node.attrs.align ?? "center") as WikiNodeAlignment,
      widthPx: menuWidthPx(resolved.node),
      topLevel: isTopLevel(editor, resolved.position),
      ...target,
    };
  }

  const resolved = resolveWikiNodeFromElement(editor, element, MENU_NODE_TYPES);
  if (!resolved) return null;
  return nodeMenu(editor, resolved.node, resolved.position, target);
};

/**
 * The menu the current selection raises, or NULL when it raises none.
 * Everything a block itself offers hangs off the focused block instead
 * (wikiMenuFromElement) — only the two menus that target a stretch of
 * text rather than a block are raised from here.
 */
export const wikiMenuFromSelection = (
  editor: Editor,
  editorBlurred: boolean,
): WikiEditMenuState => {
  const { selection } = editor.state;

  /**
   * Only a CARET inside a link raises the link menu (deliberately
   * blur-proof — focus moves into its URL form while editing). A
   * non-empty selection over a link falls through to the formatting menu
   * below, whose link button opens the link dialog prefilled.
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
      key: wikiTargetKey(blockDom),
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
