import "server-only";

import { remarkDiscordFormatting } from "@/modules/discord/utils/remarkDiscordFormatting";
import type { Code, Link, Nodes, Text } from "mdast";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import stripMarkdown from "strip-markdown";

/** The default configuration drops a code block without a notice. */
const keepCodeText = (node: Code): Text => ({
  type: "text",
  value: node.value,
});

/**
 * The default configuration keeps the label of a link but drops its address.
 * A reader of a calendar entry cannot open a link without the address, thus
 * the address follows the label. A bare URL is already its own label.
 */
const keepLinkAddress = (node: Link): Nodes[] => {
  const [firstChild, ...otherChildren] = node.children;

  const isBareUrl =
    otherChildren.length === 0 &&
    firstChild?.type === "text" &&
    firstChild.value === node.url;
  if (isBareUrl) return node.children;

  return [...node.children, { type: "text", value: ` (${node.url})` }];
};

const processor = remark()
  .use(remarkGfm)
  .use(remarkDiscordFormatting)
  .use(stripMarkdown, {
    keep: ["list", "listItem"],
    remove: [
      ["code", keepCodeText],
      ["link", keepLinkAddress],
    ],
  })
  .data("settings", {
    bullet: "-",
    /**
     * Without this handler the escape function of `remark-stringify` turns a
     * literal `*` of the description into `\*`.
     */
    handlers: { text: (node: Text) => node.value },
  });

/**
 * Removes the formats of Discord from a description and keeps its text. The
 * calendar exports use it, so that no format character reaches the calendar
 * entry of the user.
 *
 * The function uses the same format set as the renderer of the app: a
 * construct that Discord does not know keeps the characters of the input.
 *
 * Server-side only. `remark` must stay out of the bundle of the browser.
 */
export const markdownToPlainText = (markdown: string): string => {
  if (!markdown) return "";

  return String(processor.processSync(markdown)).trim();
};
