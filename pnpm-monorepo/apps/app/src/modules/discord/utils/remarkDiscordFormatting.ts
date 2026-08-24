import type { ListItem, Nodes, Root, RootContent } from "mdast";
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

/**
 * The multi-line quote of Discord. Standard Markdown reads it as three block
 * quotes inside each other, thus the characters need an explicit rule.
 */
const DISCORD_MULTI_LINE_QUOTE_MARKER = ">>>";

/** These parents hold blocks, thus a replacement needs a paragraph around it. */
const BLOCK_PARENT_TYPES: ReadonlySet<string> = new Set([
  "blockquote",
  "listItem",
  "root",
]);

/** Matches the list marker and the check box of a task list item. */
const TASK_LIST_ITEM_PATTERN = /^\s*(?:[-*+]|\d+[.)])\s+(\[[ xX]\]\s*)/;

const getOriginalText = (node: Nodes, source: string): string => {
  const start = node.position?.start.offset;
  const end = node.position?.end.offset;
  if (start === undefined || end === undefined) return "";
  return source.slice(start, end);
};

const isRenderedByDiscord = (node: Nodes, source: string): boolean => {
  if (node.type === "heading") return node.depth <= DISCORD_MAX_HEADING_DEPTH;

  if (node.type === "blockquote")
    return !getOriginalText(node, source).startsWith(
      DISCORD_MULTI_LINE_QUOTE_MARKER,
    );

  return DISCORD_NODE_TYPES.has(node.type);
};

/**
 * Discord shows the check box of a task list item as normal characters, but it
 * still renders the list itself.
 */
const flattenTaskListItem = (item: ListItem, source: string) => {
  const checkBox = TASK_LIST_ITEM_PATTERN.exec(getOriginalText(item, source));
  item.checked = null;

  // A task list item always starts with a paragraph, thus the check box has a
  // place to go.
  const firstBlock = item.children.at(0);
  if (!checkBox || firstBlock?.type !== "paragraph") return;

  firstBlock.children.unshift({ type: "text", value: checkBox[1] });
};

/**
 * Rewrites the node tree so that it shows the same formats as Discord. The
 * plugin reads the characters of the input from the file, thus a construct
 * that Discord does not know keeps its original characters.
 */
export const remarkDiscordFormatting =
  () => (tree: Root, file: { toString(): string }) => {
    const source = file.toString();

    visit(tree, (node, index, parent) => {
      // Standard Markdown makes bold text from `__text__`, Discord makes
      // underlined text from it.
      if (
        node.type === "strong" &&
        getOriginalText(node, source).startsWith("__")
      ) {
        node.data = { ...node.data, hName: "u" };
        return;
      }

      if (node.type === "listItem" && typeof node.checked === "boolean") {
        flattenTaskListItem(node, source);
        return;
      }

      if (!parent || index === undefined || isRenderedByDiscord(node, source))
        return;

      const text = {
        type: "text" as const,
        value: getOriginalText(node, source),
      };
      const children: RootContent[] = parent.children;
      children.splice(
        index,
        1,
        BLOCK_PARENT_TYPES.has(parent.type)
          ? { type: "paragraph", children: [text] }
          : text,
      );

      return SKIP;
    });
  };
