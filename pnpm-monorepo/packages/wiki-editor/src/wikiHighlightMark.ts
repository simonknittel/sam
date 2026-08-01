import { Highlight } from "@tiptap/extension-highlight";
import { WIKI_COLOR_TOKENS, type WikiColorToken } from "./wikiColorTokens.js";

export const WIKI_HIGHLIGHT_COLORS = WIKI_COLOR_TOKENS;
export type WikiHighlightColor = WikiColorToken;

/**
 * The Highlight mark with its color stored as a named token and mapped to
 * concrete colors in CSS (wikiEditor.css) — same approach as the
 * wikiTextColor mark, so documents stay independent of the theme's color
 * values (the stock extension would store raw CSS colors).
 */
export const WikiHighlight = Highlight.extend({
  addAttributes() {
    return {
      color: {
        default: "yellow",
        parseHTML: (element) => element.getAttribute("data-highlight"),
        renderHTML: (attributes) => ({
          "data-highlight": String(attributes.color),
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "mark[data-highlight]",
        // Unknown tokens stay plain text instead of falling back to a color
        getAttrs: (element) =>
          WIKI_HIGHLIGHT_COLORS.includes(
            element.getAttribute("data-highlight") as WikiHighlightColor,
          )
            ? null
            : false,
      },
    ];
  },
});
