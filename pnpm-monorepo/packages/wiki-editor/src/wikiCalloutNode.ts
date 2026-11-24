import { Node, mergeAttributes } from "@tiptap/core";
import { WIKI_GRID_HOST_CONTENT } from "./wikiGridNodes.js";
import {
  wikiAlignAttribute,
  wikiWidthPxAttribute,
} from "./wikiResizableNodes.js";

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
      toggleWikiCallout: (color: WikiCalloutColor) => ReturnType;
      setWikiCalloutColor: (color: WikiCalloutColor) => ReturnType;
    };
  }
}

export const WikiCallout = Node.create({
  name: "wikiCallout",
  group: "block",
  content: WIKI_GRID_HOST_CONTENT,
  defining: true,

  addAttributes() {
    return {
      ...wikiWidthPxAttribute(),
      ...wikiAlignAttribute(),
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
