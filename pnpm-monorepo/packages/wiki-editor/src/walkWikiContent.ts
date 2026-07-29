/**
 * Minimal structural type for Tiptap JSON documents. Stored content is user
 * input, so every field is optional.
 */
export interface WikiJsonContentNode {
  readonly type?: string;
  readonly text?: string;
  readonly attrs?: Readonly<Record<string, unknown>>;
  readonly content?: readonly WikiJsonContentNode[];
}

/**
 * Depth-first, document-order walk over a Tiptap JSON document, calling
 * visit for every node. Non-object input is ignored.
 */
export const walkWikiContent = (
  content: unknown,
  visit: (node: WikiJsonContentNode) => void,
): void => {
  if (!content || typeof content !== "object") return;

  const walk = (node: WikiJsonContentNode) => {
    visit(node);
    if (Array.isArray(node.content)) {
      for (const child of node.content) walk(child as WikiJsonContentNode);
    }
  };

  walk(content as WikiJsonContentNode);
};
