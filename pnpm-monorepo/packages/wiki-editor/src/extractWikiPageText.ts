import { walkWikiContent } from "./walkWikiContent.js";

/**
 * Extracts the plain text of a Tiptap JSON document, used for full-text
 * search. Block boundaries become spaces so words don't get glued together.
 */
export const extractWikiPageText = (content: unknown): string => {
  const parts: string[] = [];

  walkWikiContent(content, (node) => {
    if (typeof node.text === "string") parts.push(node.text);
    if (
      node.type === "wikiAttachment" &&
      typeof node.attrs?.fileName === "string"
    )
      parts.push(node.attrs.fileName);
    if (
      node.type === "wikiCitizenMention" &&
      typeof node.attrs?.handle === "string" &&
      node.attrs.handle
    )
      parts.push(node.attrs.handle);
    if (
      node.type === "wikiVariantLink" &&
      typeof node.attrs?.name === "string" &&
      node.attrs.name
    )
      parts.push(node.attrs.name);
  });

  return parts.join(" ").replace(/\s+/g, " ").trim();
};
