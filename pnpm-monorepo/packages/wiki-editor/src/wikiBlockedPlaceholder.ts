import { mergeAttributes } from "@tiptap/core";
import type { DOMOutputSpec } from "@tiptap/pm/model";

/**
 * Placeholder for embed nodes whose src failed validation. All blocked
 * variants share the `data-wiki-embed-blocked` styling hook (see the app's
 * wikiEditor.css). Deliberately no round-trip: the wrapper's identifying
 * attribute (data-wiki-embed) is omitted, so copied placeholders paste as
 * plain content, not as the node.
 */
export const renderWikiBlockedPlaceholder = (
  HTMLAttributes: Record<string, unknown>,
  message = "Diese Einbettung ist ungültig und wird nicht angezeigt.",
): DOMOutputSpec => [
  "div",
  mergeAttributes({ "data-wiki-embed-blocked": "" }, HTMLAttributes),
  message,
];
