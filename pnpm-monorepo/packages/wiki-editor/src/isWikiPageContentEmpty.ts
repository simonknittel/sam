import { isNodeEmpty } from "@tiptap/core";
import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { getWikiEditorSchema } from "./wikiEditorExtensions.js";

/**
 * Whether a page's Tiptap JSON has no visible content. Matches the
 * editor's own `isEmpty` (which drives the Placeholder extension) so the
 * static render and the editor agree on when to show the empty-page
 * message — an emptied page persists as a doc with one empty paragraph,
 * not as null. Content that fails to parse counts as non-empty so it
 * still reaches the renderer.
 */
export const isWikiPageContentEmpty = (content: unknown): boolean => {
  if (!content) return true;
  try {
    return isNodeEmpty(
      ProseMirrorNode.fromJSON(getWikiEditorSchema(), content),
    );
  } catch {
    return false;
  }
};
