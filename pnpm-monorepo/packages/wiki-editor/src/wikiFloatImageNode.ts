import {
  renderWikiImageHTML,
  WikiImage,
  wikiImageAnchorParseRule,
  type WikiImageOptions,
} from "./wikiImageNode.js";

/**
 * Marks an anchor as a floated image's own element (the counterpart of
 * data-wiki-image on the block image).
 */
const WIKI_FLOAT_IMAGE_ATTRIBUTE = "data-wiki-float-image";

export const WIKI_FLOAT_IMAGE_SIDES = ["left", "right"] as const;
export type WikiFloatImageSide = (typeof WIKI_FLOAT_IMAGE_SIDES)[number];

/**
 * Width a block image gets when it is floated without an explicit width of
 * its own and the target paragraph cannot be measured — half the narrow
 * column preset, so text keeps room to flow next to the image.
 */
export const WIKI_FLOAT_IMAGE_FALLBACK_WIDTH_PX = 360;

/**
 * The image variant text flows around: an INLINE node living inside the
 * paragraph, floated to one of its sides. Living inside the text block —
 * instead of being a floated sibling — is what anchors the float to the
 * block's own box: paragraphs carry their own width and centering margins
 * (wikiResizableNodes.ts), so a float at document level would align with
 * the editor while the text column sits elsewhere. Inside the paragraph
 * the browser aligns the float with the paragraph's edges and keeps it
 * there when the paragraph is resized, and the width's max-width: 100%
 * caps the image at the paragraph's current width.
 *
 * A separate node type instead of an `align` value on the block image:
 * the two live at different depths of the document, so switching between
 * them is a structural move (wikiImageFloat.ts in the app), not an
 * attribute change — and existing collaborative documents keep their block
 * images untouched.
 */
export const WikiFloatImage = WikiImage.extend({
  name: "wikiFloatImage",

  addOptions() {
    return {
      // The cast widens `this.parent?.()`, same as WikiImageNodeView does
      ...(this.parent?.() as WikiImageOptions),
      // The stock Image reads this for its `inline`/`group` config
      inline: true,
    };
  },

  addAttributes() {
    /**
     * The block image's attributes minus its block position: inside a
     * paragraph the float side takes that role.
     */
    const { align, ...inherited } = this.parent?.() ?? {};
    void align;

    return {
      ...inherited,
      floatSide: {
        default: "left",
        parseHTML: (element: HTMLElement): WikiFloatImageSide =>
          element.getAttribute("data-float-side") === "right"
            ? "right"
            : "left",
        renderHTML: (attributes: Record<string, unknown>) => {
          const side: WikiFloatImageSide =
            attributes.floatSide === "right" ? "right" : "left";
          return {
            "data-float-side": side,
            style: `float: ${side}`,
          };
        },
      },
    };
  },

  /**
   * The stock Image's `setImage` would re-register under this node's type
   * and, registered later, override the block image's command — floated
   * images are only ever created by converting a block image
   * (wikiImageFloat.ts in the app).
   */
  addCommands() {
    return {};
  },

  /** Same reasoning: typing markdown image syntax creates a block image */
  addInputRules() {
    return [];
  },

  /**
   * Only the node's own markup — foreign `img` markup stays with the block
   * image's rules, so pasted images never float unasked.
   */
  parseHTML() {
    return [
      wikiImageAnchorParseRule(
        WIKI_FLOAT_IMAGE_ATTRIBUTE,
        this.options.allowBase64,
      ),
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return renderWikiImageHTML(
      WIKI_FLOAT_IMAGE_ATTRIBUTE,
      this.options.HTMLAttributes,
      node,
      HTMLAttributes,
    );
  },
});
