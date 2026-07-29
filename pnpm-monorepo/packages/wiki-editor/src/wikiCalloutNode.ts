import { Node, mergeAttributes } from "@tiptap/core";

export const WIKI_CALLOUT_COLORS = [
  "neutral",
  "blue",
  "green",
  "yellow",
  "red",
] as const;
export type WikiCalloutColor = (typeof WIKI_CALLOUT_COLORS)[number];

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    wikiCallout: {
      /** Wraps the selection in a callout (or unwraps it if already inside) */
      toggleWikiCallout: (color: WikiCalloutColor) => ReturnType;
      /** Changes the color of the surrounding callout */
      setWikiCalloutColor: (color: WikiCalloutColor) => ReturnType;
    };
  }
}

/**
 * A block highlighted with a colored background and border, e.g. for
 * notes, warnings or emphasized sections.
 */
export const WikiCallout = Node.create({
  name: "wikiCallout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      color: {
        default: "blue",
        parseHTML: (element) => {
          const parsed = element.getAttribute("data-color");
          return WIKI_CALLOUT_COLORS.includes(parsed as WikiCalloutColor)
            ? parsed
            : "blue";
        },
        renderHTML: (attributes) => ({
          "data-color": String(attributes.color),
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-wiki-callout]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes({ "data-wiki-callout": "" }, HTMLAttributes),
      0,
    ];
  },

  addCommands() {
    return {
      toggleWikiCallout:
        (color) =>
        ({ commands }) => {
          return commands.toggleWrap(this.name, { color });
        },
      setWikiCalloutColor:
        (color) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, { color });
        },
    };
  },
});
