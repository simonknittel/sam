import { Mark, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    wikiSmallText: {
      /** Renders the selected text smaller */
      setWikiSmallText: () => ReturnType;
      /** Renders the selected text smaller, or restores the normal size */
      toggleWikiSmallText: () => ReturnType;
      /** Restores the normal size for the selected text */
      unsetWikiSmallText: () => ReturnType;
    };
  }
}

/**
 * Smaller inline text for side notes, captions and fine print. A mark
 * instead of a block type because the size says nothing about the
 * document's structure — that way it also works inside headings, list
 * items and table cells. Renders as <small> so pasting in and out of the
 * wiki keeps the meaning; the concrete size lives in CSS (wikiEditor.css).
 */
export const WikiSmallTextMark = Mark.create({
  name: "wikiSmallText",

  parseHTML() {
    return [{ tag: "small" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["small", mergeAttributes(HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setWikiSmallText:
        () =>
        ({ commands }) => {
          return commands.setMark(this.name);
        },
      toggleWikiSmallText:
        () =>
        ({ commands }) => {
          return commands.toggleMark(this.name);
        },
      unsetWikiSmallText:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },
});
