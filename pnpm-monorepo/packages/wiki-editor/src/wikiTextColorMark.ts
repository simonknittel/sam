import { Mark, mergeAttributes } from "@tiptap/core";

export const WIKI_TEXT_COLORS = [
  "yellow",
  "green",
  "blue",
  "red",
  "purple",
] as const;
export type WikiTextColor = (typeof WIKI_TEXT_COLORS)[number];

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    wikiTextColor: {
      /** Colors the selected text */
      setWikiTextColor: (color: WikiTextColor) => ReturnType;
      /** Colors the selected text, or removes the color if already set */
      toggleWikiTextColor: (color: WikiTextColor) => ReturnType;
      /** Removes the text color from the selection */
      unsetWikiTextColor: () => ReturnType;
    };
  }
}

/**
 * Inline text color, stored as a named token and mapped to concrete colors
 * in CSS (wikiEditor.css) — same approach as the callout node's color, so
 * documents stay independent of the theme's color values.
 */
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
