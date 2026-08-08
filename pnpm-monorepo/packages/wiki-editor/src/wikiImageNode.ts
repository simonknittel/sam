import { mergeAttributes } from "@tiptap/core";
import { Image } from "@tiptap/extension-image";
import {
  wikiAlignAttribute,
  wikiWidthPxAttribute,
} from "./wikiResizableNodes.js";

export type { ImageOptions as WikiImageOptions } from "@tiptap/extension-image";

/**
 * Marks an anchor as an image node's own element rather than a link an
 * author wrote around content — the editor's hover menu tells them apart
 * by it (see wikiMenuFromElement).
 */
const WIKI_IMAGE_ATTRIBUTE = "data-wiki-image";

/**
 * Attributes belonging on the `img`. Everything else the node renders —
 * the width/alignment styles above all — goes on the anchor, which is the
 * node's outer element and therefore the one the resize handles measure
 * and size (see WikiResizeHandles).
 */
const IMAGE_ELEMENT_ATTRIBUTES = ["src", "alt", "title", "width", "height"];

/**
 * Those of them read back from the image inside the anchor when our own
 * markup is parsed. `width`/`height` are left with Tiptap's default
 * parsing: they are numbers, which that conversion handles and this one
 * would not, and the wiki never sets them anyway.
 */
const IMAGE_ELEMENT_TEXT_ATTRIBUTES = ["alt", "title"];

/**
 * Reads an `img` attribute from whichever element a parse rule matched:
 * the image itself in foreign markup, the anchor around it when our own
 * rendered markup is pasted back in.
 */
const parseImageElementAttribute =
  (name: string) =>
  (element: HTMLElement): string | null =>
    element.tagName === "IMG"
      ? element.getAttribute(name)
      : (element.querySelector("img")?.getAttribute(name) ?? null);

/**
 * `src` comes from the anchor's `href`, not the image inside it: both
 * always carry the original URL, but renderers may swap the displayed
 * img's src for an optimized variant (WikiContentImage) — parsing that
 * back would store the optimizer URL and lose the upload identity.
 */
const parseImageSource = (element: HTMLElement): string | null =>
  element.tagName === "IMG"
    ? element.getAttribute("src")
    : element.getAttribute("href");

/**
 * The stock Image node, wrapped in a link to the file it displays. Images
 * are usually shown scaled down — by a width preset, a resize drag or just
 * a narrow viewport — so readers need a way to the original, and since
 * `src` already points at the uploaded file that is all the link needs.
 *
 * Clicking one while editing would navigate away from the page instead of
 * selecting the image; WikiNodeClickSelection prevents that, as it does
 * for the other nodes rendering as anchors.
 *
 * Unlike the other blocks the width defaults to NULL — natural image size
 * — because the wide-preset default would upscale small images.
 */
export const WikiImage = Image.extend({
  addAttributes() {
    const inherited: Record<string, unknown> = this.parent?.() ?? {};

    const readFromImageElement: Record<string, unknown> = {};
    for (const name of IMAGE_ELEMENT_TEXT_ATTRIBUTES) {
      if (!(name in inherited)) continue;
      readFromImageElement[name] = {
        ...(inherited[name] as Record<string, unknown>),
        parseHTML: parseImageElementAttribute(name),
      };
    }

    return {
      ...inherited,
      ...readFromImageElement,
      src: {
        ...(inherited.src as Record<string, unknown>),
        parseHTML: parseImageSource,
      },
      ...wikiWidthPxAttribute(null),
      ...wikiAlignAttribute(),
    };
  },

  parseHTML() {
    const { allowBase64 } = this.options;

    return [
      {
        /**
         * Our own markup, which carries the layout attributes on the
         * anchor. Ranked above the link mark's `a[href]` rule (priority
         * 50), which would otherwise claim the anchor and leave the image
         * inside it to the plain rule below — losing width and alignment.
         */
        tag: `a[${WIKI_IMAGE_ATTRIBUTE}]`,
        priority: 60,
        getAttrs: (element: HTMLElement) => {
          const source = parseImageSource(element) ?? "";
          if (!source || !element.querySelector("img")) return false;
          // The same base64 restriction the inherited rule applies
          return !allowBase64 && source.startsWith("data:") ? false : null;
        },
      },
      ...(this.parent?.() ?? []),
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const source = String(node.attrs.src ?? "");

    /**
     * Lazy on every rendering of the node: Tiptap runs a (re)created
     * editor's document through renderHTML once before the node views take
     * over, and browsers fetch an eager img the moment src is set, even
     * detached — the original file would download during that throwaway
     * render. A lazy img only loads once connected and near the viewport.
     */
    const loadingAttributes = { loading: "lazy", decoding: "async" };

    /**
     * Nothing to link to — the image stays the node's outer element and
     * keeps carrying the layout styles itself.
     */
    if (!source)
      return [
        "img",
        mergeAttributes(
          loadingAttributes,
          this.options.HTMLAttributes,
          HTMLAttributes,
        ),
      ];

    const imageAttributes: Record<string, unknown> = {};
    const anchorAttributes: Record<string, unknown> = {};
    for (const [name, value] of Object.entries(HTMLAttributes))
      if (IMAGE_ELEMENT_ATTRIBUTES.includes(name))
        imageAttributes[name] = value;
      else anchorAttributes[name] = value;

    return [
      "a",
      mergeAttributes(
        {
          [WIKI_IMAGE_ATTRIBUTE]: "",
          href: source,
          target: "_blank",
          rel: "noopener noreferrer",
          /**
           * Without an alt the image cannot name the link — give screen
           * readers a fallback instead of an unnamed tab stop
           */
          ...(node.attrs.alt
            ? {}
            : { "aria-label": "Bild in Originalgröße öffnen" }),
        },
        anchorAttributes,
      ),
      [
        "img",
        mergeAttributes(
          loadingAttributes,
          this.options.HTMLAttributes,
          imageAttributes,
        ),
      ],
    ];
  },
});
