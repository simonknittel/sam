import type { ListItem, Nodes, Paragraph, Parents, RootContent } from "mdast";
import { SKIP, visit } from "unist-util-visit";

/**
 * The Markdown constructs that Discord renders. Everything else keeps the
 * characters of the input, because Discord shows a format it does not know as
 * normal text.
 *
 * This set is the single definition of the format set. The renderer and the
 * plain-text conversion for the calendar exports both build on it.
 */
const DISCORD_NODE_TYPES: ReadonlySet<string> = new Set([
  "blockquote",
  "break",
  "code",
  "delete",
  "emphasis",
  "heading",
  "inlineCode",
  "link",
  "list",
  "listItem",
  "paragraph",
  "root",
  "strong",
  "text",
]);

/** Discord renders `#`, `##` and `###`. A deeper heading stays normal text. */
const DISCORD_MAX_HEADING_DEPTH = 3;

/** These parents hold blocks, thus a replacement needs a paragraph around it. */
const BLOCK_PARENT_TYPES: ReadonlySet<string> = new Set([
  "blockquote",
  "listItem",
  "root",
]);

/** Matches the list marker and the check box of a task list item. */
const TASK_LIST_ITEM_PATTERN = /^\s*(?:[-*+]|\d+[.)])\s+(\[[ xX]\]\s*)/;

/**
 * Standard Markdown makes bold text from `__text__`, Discord makes underlined
 * text from it.
 */
const UNDERLINE_MARKER = "__";

const getOriginalText = (node: Nodes, source: string): string => {
  const start = node.position?.start.offset;
  const end = node.position?.end.offset;
  if (start === undefined || end === undefined) return "";
  return source.slice(start, end);
};

const isRenderedByDiscord = (node: Nodes): boolean => {
  if (node.type === "heading") return node.depth <= DISCORD_MAX_HEADING_DEPTH;
  return DISCORD_NODE_TYPES.has(node.type);
};

const replaceChild = (
  parent: Parents,
  index: number,
  replacement: RootContent,
) => {
  const children: RootContent[] = parent.children;
  children.splice(index, 1, replacement);
};

/**
 * Discord shows the check box of a task list item as normal characters, but it
 * still renders the list itself.
 */
const flattenTaskListItem = (item: ListItem, source: string) => {
  const checkBox = TASK_LIST_ITEM_PATTERN.exec(getOriginalText(item, source));
  item.checked = null;
  if (!checkBox) return;

  const checkBoxText = { type: "text" as const, value: checkBox[1] };
  const firstBlock = item.children.at(0);

  if (firstBlock?.type === "paragraph") {
    firstBlock.children.unshift(checkBoxText);
    return;
  }

  const paragraph: Paragraph = { type: "paragraph", children: [checkBoxText] };
  item.children.unshift(paragraph);
};

/**
 * Rewrites the node tree so that it shows the same formats as Discord. The
 * plugin reads the characters of the input from the file, thus a construct
 * that Discord does not know keeps its original characters.
 */
export const remarkDiscordFormatting =
  () => (tree: Nodes, file: { toString(): string }) => {
    const source = file.toString();

    visit(tree, (node, index, parent) => {
      if (
        node.type === "strong" &&
        getOriginalText(node, source).startsWith(UNDERLINE_MARKER)
      ) {
        node.data = { ...node.data, hName: "u" };
        return;
      }

      if (node.type === "listItem" && typeof node.checked === "boolean") {
        flattenTaskListItem(node, source);
        return;
      }

      if (!parent || index === undefined || isRenderedByDiscord(node)) return;

      const text = {
        type: "text" as const,
        value: getOriginalText(node, source),
      };
      replaceChild(
        parent,
        index,
        BLOCK_PARENT_TYPES.has(parent.type)
          ? { type: "paragraph", children: [text] }
          : text,
      );

      return SKIP;
    });
  };
