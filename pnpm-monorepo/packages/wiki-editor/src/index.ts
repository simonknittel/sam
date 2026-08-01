/**
 * The wiki's Tiptap editor schema and content utilities, shared between the
 * Next.js app (editor, static rendering, server-side validation) and the
 * collab server (apps/collab, Yjs ⇄ ProseMirror conversion) so all
 * consumers always agree on the same schema.
 */
export { extractWikiPageText } from "./extractWikiPageText.js";
export { collectWikiAttachmentUploadIds } from "./wikiAttachmentNode.js";
export {
  WIKI_CALLOUT_COLORS,
  type WikiCalloutColor,
} from "./wikiCalloutNode.js";
export {
  WikiCitizenMention,
  collectWikiMentionedCitizenIds,
  resolveWikiCitizenMention,
  type ResolvedWikiCitizenMention,
  type WikiMentionedCitizen,
} from "./wikiCitizenMentionNode.js";
export {
  WikiSaveState,
  parseWikiCollabStatelessMessage,
  serializeWikiCollabStatelessMessage,
  type WikiCollabStatelessMessage,
} from "./wikiCollabSaveState.js";
export {
  WIKI_EDITOR_FRAGMENT,
  getWikiEditorExtensions,
  getWikiEditorSchema,
  type WikiEditorExtensionsOptions,
} from "./wikiEditorExtensions.js";
export {
  isAllowedWikiEmbedSrc,
  normalizeWikiEmbedUrl,
} from "./wikiEmbedNode.js";
export {
  WIKI_GRID_COLUMN_COUNTS,
  type WikiGridColumnCount,
} from "./wikiGridNodes.js";
export { createWikiHeadingIdAssigner } from "./wikiHeadingIds.js";
export { WIKI_HIGHLIGHT_COLORS } from "./wikiHighlightColors.js";
export {
  collectWikiIframeSrcs,
  isWikiIframeSrcAllowed,
} from "./wikiIframeNode.js";
export {
  WIKI_PAGE_INDEX_MATCH_MODES,
  WIKI_PAGE_INDEX_MAX_DEPTH,
  WIKI_PAGE_INDEX_MAX_TAGS,
  WIKI_PAGE_INDEX_MODES,
  WikiPageIndex,
  collectWikiPageIndexConfigs,
  normalizeWikiPageIndexConfig,
  wikiPageIndexConfigKey,
  type WikiPageIndexConfig,
  type WikiPageIndexMatchMode,
  type WikiPageIndexMode,
} from "./wikiPageIndexNode.js";
export type { WikiPageLinkedPage } from "./wikiPageLinkNode.js";
export {
  WIKI_RESIZABLE_NODE_TYPES,
  clampWikiWidthPercent,
  type WikiNodeAlignment,
} from "./wikiResizableNodes.js";
