import { mergeAttributes } from "@tiptap/core";
import { Image } from "@tiptap/extension-image";
import { getEmbedUrlFromYoutubeUrl, Youtube } from "@tiptap/extension-youtube";
import { renderWikiBlockedPlaceholder } from "./wikiBlockedPlaceholder.js";

/**
 * Node types whose width can be resized via drag handles in the editor.
 * They all carry the `widthPercent` attribute below.
 */
export const WIKI_RESIZABLE_NODE_TYPES = [
  "image",
  "youtube",
  "wikiEmbed",
  "wikiIframe",
] as const;

export const MIN_WIKI_WIDTH_PERCENT = 20;
export const MAX_WIKI_WIDTH_PERCENT = 100;

export const clampWikiWidthPercent = (value: number): number =>
  Math.min(
    MAX_WIKI_WIDTH_PERCENT,
    Math.max(MIN_WIKI_WIDTH_PERCENT, Math.round(value)),
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
 * Shared `widthPercent` attribute: NULL means natural/full width, otherwise
 * the width as percentage of the content column, rendered as an inline
 * style (which wins over the stylesheet's width defaults). Spread into a
 * node's addAttributes().
 */
export const wikiWidthPercentAttribute = () => ({
  widthPercent: {
    default: null,
    parseHTML: (element: HTMLElement) => {
      const parsed = Number(element.getAttribute("data-width-percent"));
      return Number.isFinite(parsed) && parsed > 0
        ? clampWikiWidthPercent(parsed)
        : null;
    },
    renderHTML: (attributes: Record<string, unknown>) => {
      const value = attributes.widthPercent;
      if (typeof value !== "number") return {};
      const percent = clampWikiWidthPercent(value);
      return {
        "data-width-percent": String(percent),
        style: `width: ${percent}%`,
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
      ...wikiWidthPercentAttribute(),
      ...wikiAlignAttribute(),
    };
  },
});

/**
 * The stock Youtube node plus the resizable width attribute (the inline
 * style lands on the iframe; the stylesheet keeps the aspect ratio).
 * renderHTML is replaced: the stock implementation dumps every extension
 * option onto the iframe as a DOM attribute (allowfullscreen, autoplay,
 * disableKBcontrols, …), which the React static renderer rejects with
 * console warnings.
 */
export const WikiYoutube = Youtube.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...wikiWidthPercentAttribute(),
      ...wikiAlignAttribute(),
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    const embedUrl = getEmbedUrlFromYoutubeUrl({
      url: String(node.attrs.src ?? ""),
      controls: this.options.controls,
      nocookie: this.options.nocookie,
      startAt: (node.attrs.start as number | null) ?? 0,
      rel: this.options.rel,
    });

    if (!embedUrl) return renderWikiBlockedPlaceholder(HTMLAttributes);

    const attributes: Record<string, unknown> = { ...HTMLAttributes };
    delete attributes.src;
    delete attributes.start;

    return [
      "div",
      { "data-youtube-video": "" },
      [
        "iframe",
        mergeAttributes(this.options.HTMLAttributes, attributes, {
          src: embedUrl,
          allow:
            "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
          /**
           * Camel-cased for the React static renderer; the editor DOM is
           * unaffected (setAttribute lowercases HTML attribute names).
           */
          allowFullScreen: true,
          referrerPolicy: "strict-origin-when-cross-origin",
        }),
      ],
    ];
  },
});
