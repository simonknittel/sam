import { Mark, mergeAttributes } from "@tiptap/core";
import { WIKI_COLOR_TOKENS, type WikiColorToken } from "./wikiColorTokens.js";

export const WIKI_TEXT_COLORS = WIKI_COLOR_TOKENS;
export type WikiTextColor = WikiColorToken;

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    wikiTextColor: {
      setWikiTextColor: (color: WikiTextColor) => ReturnType;
      toggleWikiTextColor: (color: WikiTextColor) => ReturnType;
      unsetWikiTextColor: () => ReturnType;
    };
  }
}

export const WikiTextColorMark = Mark.create({
  name: "wikiTextColor",

  addAttributes() {
    return {
      color: {
        default: "blue",
        parseHTML: (element) => element.getAttribute("data-text-color"),
        renderHTML: (attributes) => ({
          "data-text-color": String(attributes.color),
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-text-color]",
        // Unknown tokens stay plain text instead of falling back to a color
        getAttrs: (element) =>
          WIKI_TEXT_COLORS.includes(
            element.getAttribute("data-text-color") as WikiTextColor,
          )
            ? null
            : false,
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setWikiTextColor:
        (color) =>
        ({ commands }) => {
          return commands.setMark(this.name, { color });
        },
      toggleWikiTextColor:
        (color) =>
        ({ commands }) => {
          return commands.toggleMark(this.name, { color });
        },
      unsetWikiTextColor:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },
});
