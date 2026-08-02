import type { Node } from "@tiptap/core";
import { Image } from "@tiptap/extension-image";
import type { EditorState, Transaction } from "@tiptap/pm/state";

/**
 * Node types whose width can be resized via drag handles in the editor —
 * every block-level node (plus the grid, which lives outside the `block`
 * group). They all carry the `widthPx`/`align` attributes below, which
 * only apply to direct children of the document (see
 * stripWikiNestedBlockLayout).
 */
export const WIKI_RESIZABLE_NODE_TYPES = [
  "paragraph",
  "heading",
  "bulletList",
  "orderedList",
  "taskList",
  "blockquote",
  "codeBlock",
  "table",
  "horizontalRule",
  "details",
  "wikiCallout",
  "wikiGrid",
  "image",
  "wikiEmbed",
  "wikiAttachment",
  "wikiPageIndex",
  "wikiRoleCitizens",
] as const;

export const MIN_WIKI_WIDTH_PX = 120;
export const MAX_WIKI_WIDTH_PX = 2000;

/**
 * The width presets offered in the block menus next to the drag handles.
 * They double as the schema defaults: most blocks start narrow so pages
 * read as a centered, comfortable column, while the space-hungry blocks
 * (rulers, embeds, code, tables, grids) start wide — see the node
 * definitions.
 */
export const WIKI_NARROW_WIDTH_PX = 720;
export const WIKI_WIDE_WIDTH_PX = 1080;

/**
 *`widthPx` value for explicitly full column width. A distinct marker
 * (not NULL) because Tiptap ignores NULL returned from an attribute's
 * parseHTML — the schema default (the wide preset) would win and pasted
 * full-width blocks would silently narrow.
 */
export const WIKI_FULL_WIDTH = "full";

export const clampWikiWidthPx = (value: number): number =>
  Math.min(MAX_WIKI_WIDTH_PX, Math.max(MIN_WIKI_WIDTH_PX, Math.round(value)));

/**
 * Whether a node's height can be resized via the bottom drag handle. Only
 * the generic-iframe embed: its content has no intrinsic aspect ratio, so
 * no single default height fits.
 */
export const isWikiHeightResizable = (
  nodeTypeName: string,
  provider: unknown,
): boolean => nodeTypeName === "wikiEmbed" && provider === "iframe";

export const MIN_WIKI_IFRAME_HEIGHT_PX = 120;
export const MAX_WIKI_IFRAME_HEIGHT_PX = 2000;

export const clampWikiIframeHeightPx = (value: number): number =>
  Math.min(
    MAX_WIKI_IFRAME_HEIGHT_PX,
    Math.max(MIN_WIKI_IFRAME_HEIGHT_PX, Math.round(value)),
  );

export const WIKI_NODE_ALIGNMENTS = ["left", "center", "right"] as const;
export type WikiNodeAlignment = (typeof WIKI_NODE_ALIGNMENTS)[number];

/**
 * Shared `align` attribute for the resizable nodes, rendered as margins.
 * NULL is the default and means CENTERED — blocks narrower than the
 * content column (which is most of them, given the default width) center
 * in it; "left"/"right" pin them to an edge. "center" normalizes to NULL
 * when parsing so the default state has a single representation
 * (documents may still carry an explicit "center", treated like NULL).
 * The margins are always rendered with both sides explicit, so
 * user-agent defaults (e.g. hr's auto margins) cannot leak through; at
 * full width they simply have no effect.
 */
export const wikiAlignAttribute = () => ({
  align: {
    default: null,
    parseHTML: (element: HTMLElement) => {
      const parsed = element.getAttribute("data-align");
      return parsed === "left" || parsed === "right" ? parsed : null;
    },
    renderHTML: (attributes: Record<string, unknown>) => {
      const value = attributes.align;
      if (value === "left")
        return {
          "data-align": "left",
          style: "margin-left: 0; margin-right: auto",
        };
      if (value === "right")
        return {
          "data-align": "right",
          style: "margin-left: auto; margin-right: 0",
        };
      return { style: "margin-left: auto; margin-right: auto" };
    },
  },
});

/**
 * Shared `widthPx` attribute. Values: a pixel number, WIKI_FULL_WIDTH for
 * explicitly full column width, or NULL for "no explicit width" (renders
 * like full width; serialized as nothing so pasting re-applies the
 * default). The default is per node type: the narrow preset unless the
 * node passes something else — the wide preset for space-hungry blocks,
 * NULL for images (a pixel default would upscale small images past
 * their natural size). Pixel widths are absolute on purpose: a percentage
 * shrinks with the viewport and keeps proportional whitespace next to
 * the block, making it tiny on phones — the max-width caps the block at
 * the content column instead. Spread into a node's addAttributes().
 */
export const wikiWidthPxAttribute = (
  defaultValue: number | null = WIKI_NARROW_WIDTH_PX,
) => ({
  widthPx: {
    default: defaultValue,
    parseHTML: (element: HTMLElement) => {
      const value = element.getAttribute("data-width-px");
      if (value === WIKI_FULL_WIDTH) return WIKI_FULL_WIDTH;
      const parsed = Number(value);
      // undefined = missing/invalid, the schema default applies
      return Number.isFinite(parsed) && parsed > 0
        ? clampWikiWidthPx(parsed)
        : undefined;
    },
    renderHTML: (attributes: Record<string, unknown>) => {
      const value = attributes.widthPx;
      if (value === WIKI_FULL_WIDTH)
        return { "data-width-px": WIKI_FULL_WIDTH };
      if (typeof value !== "number") return {};
      const px = clampWikiWidthPx(value);
      return {
        "data-width-px": String(px),
        style: `width: ${px}px; max-width: 100%`,
      };
    },
  },
});

/**
 * `heightPx` attribute of the generic iframe: NULL means the stylesheet's
 * default height, otherwise the frame height in pixels. Rendered as an
 * inline height on the wrapper div (where the attribute styles land) — the
 * stylesheet stretches the iframe to the wrapper's height.
 */
export const wikiHeightPxAttribute = () => ({
  heightPx: {
    default: null,
    parseHTML: (element: HTMLElement) => {
      const parsed = Number(element.getAttribute("data-height-px"));
      return Number.isFinite(parsed) && parsed > 0
        ? clampWikiIframeHeightPx(parsed)
        : null;
    },
    renderHTML: (attributes: Record<string, unknown>) => {
      const value = attributes.heightPx;
      if (typeof value !== "number") return {};
      const px = clampWikiIframeHeightPx(value);
      return {
        "data-height-px": String(px),
        style: `height: ${px}px`,
      };
    },
  },
});

/**
 * A node plus the resizable width and block-position attributes. The
 * inline styles land on the node's outer rendered element.
 */
export const withWikiBlockLayout = <Options, Storage>(
  node: Node<Options, Storage>,
  defaultWidthPx: number | null = WIKI_NARROW_WIDTH_PX,
): Node<Options, Storage> =>
  node.extend({
    addAttributes() {
      return {
        ...this.parent?.(),
        ...wikiWidthPxAttribute(defaultWidthPx),
        ...wikiAlignAttribute(),
      };
    },
  });

/**
 * The stock Image node plus the layout attributes (on the img element).
 * Unlike the other blocks, the width defaults to NULL — natural image
 * size — because the wide-preset default would upscale small images.
 */
export const WikiImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...wikiWidthPxAttribute(null),
      ...wikiAlignAttribute(),
    };
  },
});

/**
 * A transaction clearing `widthPx`/`align` on every block that is not a
 * direct child of the document, appended to `transaction` (or NULL when
 * there is nothing to fix). Width and block position only apply at the
 * top level; the attributes survive schema fitting when a block lands
 * inside a grid cell, callout or collapsible (paste, drag'n'drop, remote
 * collab edits), so they are stripped here. `heightPx` stays — the iframe
 * height does not depend on the surrounding column.
 */
export const stripWikiNestedBlockLayout = (
  state: EditorState,
  transaction: Transaction | null = null,
): Transaction | null => {
  state.doc.descendants((node, position, parent) => {
    if (!parent || parent.type.name === "doc") return true;
    if (
      !(WIKI_RESIZABLE_NODE_TYPES as readonly string[]).includes(node.type.name)
    )
      return true;
    for (const attribute of ["widthPx", "align"]) {
      if (node.attrs[attribute] == null) continue;
      transaction ??= state.tr;
      transaction.setNodeAttribute(position, attribute, null);
    }
    return true;
  });
  return transaction;
};
