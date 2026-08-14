import type { JSONContent } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

/**
 * StarterKit's TrailingNode extension keeps an empty paragraph at the end
 * of every document, so editors can always append content — and open the
 * slash menu — without reaching for the gutter's plus button. That
 * paragraph is part of the stored document, so readers would see it as a
 * blank line below the page's content: both read-only renderings (the
 * static render and the read-only editor) drop it with the helpers below.
 *
 * A document that consists of nothing but that paragraph keeps it — it is
 * the empty page's own line, carrying the placeholder text.
 */

const isEmptyParagraph = (node: JSONContent | undefined): boolean =>
  node?.type === "paragraph" && !node.content?.length;

/** The document without its trailing empty paragraph, for the static render */
export const withoutWikiTrailingEmptyParagraph = (
  content: JSONContent,
): JSONContent => {
  const nodes = content.content;
  if (!nodes || nodes.length < 2 || !isEmptyParagraph(nodes.at(-1)))
    return content;
  return { ...content, content: nodes.slice(0, -1) };
};

interface WikiDocumentRange {
  readonly from: number;
  readonly to: number;
}

/**
 * Position of the trailing empty paragraph inside the document, or NULL
 * when the document doesn't end in one — for the editor, which can only
 * hide it (a read-only client must not change the document).
 */
export const findWikiTrailingEmptyParagraph = (
  document: ProseMirrorNode,
): WikiDocumentRange | null => {
  const lastNode = document.lastChild;
  if (
    document.childCount < 2 ||
    lastNode?.type.name !== "paragraph" ||
    lastNode.content.size > 0
  )
    return null;
  return {
    from: document.content.size - lastNode.nodeSize,
    to: document.content.size,
  };
};
