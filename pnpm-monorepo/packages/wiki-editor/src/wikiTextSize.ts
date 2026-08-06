import { Extension, type Node } from "@tiptap/core";

/**
 * Block-level text sizes. NULL — the default — is the normal size; the
 * concrete factor lives in CSS (wikiEditor.css). Unlike the inline
 * `wikiSmallText` mark this also shrinks the block's leading and its
 * margins: a line box is at least as tall as the strut of the block
 * containing it, so a mark can never make multiple small lines sit
 * closer together.
 */
export const WIKI_TEXT_SIZES = ["small"] as const;
export type WikiTextSize = (typeof WIKI_TEXT_SIZES)[number];

/**
 * The list types carrying the `textSize` attribute — they are switched as
 * a whole from their block menu, unlike paragraphs, which also carry it.
 * Headings are left out on purpose: a small heading weakens the document
 * outline. Every other block can hold small paragraphs instead.
 */
export const WIKI_TEXT_SIZE_LIST_TYPES = [
  "bulletList",
  "orderedList",
  "taskList",
] as const;

const isWikiTextSize = (value: unknown): value is WikiTextSize =>
  typeof value === "string" &&
  (WIKI_TEXT_SIZES as readonly string[]).includes(value);

/**
 * Shared `textSize` attribute, rendered as a data attribute rather than an
 * inline style so the size stays in the stylesheet — the static renderer
 * emits it through the node's renderHTML without needing a mapping of its
 * own. Named `textSize` (not `size`) because `size` is the attachment
 * node's file size in the same schema, and to match the text color mark's
 * `data-text-color`.
 */
export const wikiTextSizeAttribute = () => ({
  textSize: {
    default: null,
    parseHTML: (element: HTMLElement) => {
      const value = element.getAttribute("data-text-size");
      return isWikiTextSize(value) ? value : null;
    },
    renderHTML: (attributes: Record<string, unknown>) => {
      const value = attributes.textSize;
      return isWikiTextSize(value) ? { "data-text-size": value } : {};
    },
  },
});

/**
 * A node plus the block-level text size attribute. Composed on top of
 * withWikiBlockLayout for the few node types that may be small — most of
 * the blocks that wrapper covers must not be.
 */
export const withWikiTextSize = <Options, Storage>(
  node: Node<Options, Storage>,
): Node<Options, Storage> =>
  node.extend({
    addAttributes() {
      return {
        ...this.parent?.(),
        ...wikiTextSizeAttribute(),
      };
    },
  });

/** Containers that own the Enter key themselves (splitListItem) */
const LIST_ITEM_TYPES = ["listItem", "taskItem"];

/**
 * Keeps the size when Enter splits a small paragraph. ProseMirror's
 * splitBlock creates the default block with DEFAULT attributes when the
 * caret sits at the end of a textblock, so without this every new
 * paragraph would fall back to the normal size — the same reason a
 * centered paragraph currently splits into a left-aligned one.
 */
export const WikiTextSize = Extension.create({
  name: "wikiTextSize",

  /**
   * Above the list extensions so the order of the extension array cannot
   * decide who handles Enter. The shortcut declines (returns FALSE) for
   * everything but small paragraphs outside list items, so every other
   * handler still runs.
   */
  priority: 1000,

  addKeyboardShortcuts() {
    return {
      Enter: () => {
        const { selection } = this.editor.state;
        if (!selection.empty) return false;

        const { $from } = selection;
        if ($from.parent.type.name !== "paragraph") return false;
        if (!isWikiTextSize($from.parent.attrs.textSize)) return false;
        if (LIST_ITEM_TYPES.includes($from.node(-1).type.name)) return false;

        return this.editor
          .chain()
          .splitBlock()
          .updateAttributes("paragraph", {
            textSize: $from.parent.attrs.textSize,
          })
          .run();
      },
    };
  },
});
