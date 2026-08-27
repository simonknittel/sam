"use client";

/**
 * Puts a node's rendered attributes — the `widthPx`/`align` styles among
 * them — on the OUTER element of a React node view.
 *
 * A React node view renders into a container element the renderer creates;
 * that container, not the component's NodeViewWrapper, is what ProseMirror
 * reports as the node's `nodeDOM` and what it decorates. Styling the
 * wrapper instead leaves the container spanning the full content column,
 * so the resize handles and the block wash frame the column while the
 * block inside them is narrower. Passed as the node view's `attrs` option,
 * which ProseMirror re-applies on every node update.
 */
export const wikiNodeViewElementAttributes = ({
  HTMLAttributes,
}: {
  HTMLAttributes: Record<string, string>;
}): Record<string, string> => HTMLAttributes;
