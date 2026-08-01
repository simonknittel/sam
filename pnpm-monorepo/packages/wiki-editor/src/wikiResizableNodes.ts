import { Image } from "@tiptap/extension-image";

/**
 * Node types whose width can be resized via drag handles in the editor.
 * They all carry the `widthPx` attribute below.
 */
export const WIKI_RESIZABLE_NODE_TYPES = ["image", "wikiEmbed"] as const;

export const MIN_WIKI_WIDTH_PX = 120;
export const MAX_WIKI_WIDTH_PX = 2000;

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
 * Shared `align` attribute for the resizable nodes: rendered as auto
 * margins, so it becomes visible once the node is narrower than the
 * content column. "left" is the default and normalizes to NULL when
 * parsing, so the default state has a single representation.
 */
export const wikiAlignAttribute = () => ({
  align: {
    default: null,
    parseHTML: (element: HTMLElement) => {
      const parsed = element.getAttribute("data-align");
      return parsed === "center" || parsed === "right" ? parsed : null;
    },
    renderHTML: (attributes: Record<string, unknown>) => {
      const value = attributes.align;
      if (value === "center")
        return {
          "data-align": "center",
          style: "margin-left: auto; margin-right: auto",
        };
      if (value === "right")
        return { "data-align": "right", style: "margin-left: auto" };
      return {};
    },
  },
});

/**
 * Shared `widthPx` attribute: NULL means natural/full width, otherwise the
 * width in pixels, rendered as an inline style (which wins over the
 * stylesheet's width defaults). Absolute on purpose: a percentage shrinks
 * with the viewport and keeps proportional whitespace next to the block,
 * making it tiny on phones — the max-width caps the block at the content
 * column instead. Spread into a node's addAttributes().
 */
export const wikiWidthPxAttribute = () => ({
  widthPx: {
    default: null,
    parseHTML: (element: HTMLElement) => {
      const parsed = Number(element.getAttribute("data-width-px"));
      return Number.isFinite(parsed) && parsed > 0
        ? clampWikiWidthPx(parsed)
        : null;
    },
    renderHTML: (attributes: Record<string, unknown>) => {
      const value = attributes.widthPx;
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
 * The stock Image node plus the resizable width attribute (the inline
 * style lands on the img element).
 */
export const WikiImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...wikiWidthPxAttribute(),
      ...wikiAlignAttribute(),
    };
  },
});
