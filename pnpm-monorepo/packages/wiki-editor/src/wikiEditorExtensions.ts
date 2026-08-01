import { getSchema } from "@tiptap/core";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import {
  Details,
  DetailsContent,
  DetailsSummary,
} from "@tiptap/extension-details";
import { Document } from "@tiptap/extension-document";
import { TaskList } from "@tiptap/extension-list";
import { TableKit } from "@tiptap/extension-table";
import { Placeholder } from "@tiptap/extensions";
import type { Schema } from "@tiptap/pm/model";
import StarterKit from "@tiptap/starter-kit";
import { common, createLowlight } from "lowlight";
import { WikiAttachment } from "./wikiAttachmentNode.js";
import { WikiCallout } from "./wikiCalloutNode.js";
import {
  WikiCitizenMention,
  type WikiMentionedCitizen,
} from "./wikiCitizenMentionNode.js";
import { WikiEmbed } from "./wikiEmbedNode.js";
import {
  WIKI_GRID_HOST_CONTENT,
  WikiGrid,
  WikiGridCell,
} from "./wikiGridNodes.js";
import { WikiHeadingIds } from "./wikiHeadingIds.js";
import { WikiHighlight } from "./wikiHighlightMark.js";
import { WikiPageIndex } from "./wikiPageIndexNode.js";
import { WikiPageLink, type WikiPageLinkedPage } from "./wikiPageLinkNode.js";
import { WikiImage } from "./wikiResizableNodes.js";
import { WikiTextColorMark } from "./wikiTextColorMark.js";
import {
  WikiBlockquote,
  WikiHeading,
  WikiListItem,
  WikiTableCell,
  WikiTableHeader,
  WikiTaskItem,
  WikiTextAlign,
  WikiTextOnlyBlockGuard,
} from "./wikiTextOnlyBlocks.js";

export interface WikiEditorExtensionsOptions {
  /** Undo/redo comes from Yjs in the collab editor instead of StarterKit */
  collaboration?: boolean;
  /**
   * Hostname of the app (without scheme/port), required by Twitch's player
   * as its `parent` query parameter. Only affects rendering, not the
   * schema.
   */
  twitchParentHost?: string;
  /**
   * Hostnames generic iframes may embed (from the wiki settings). Only
   * affects rendering, not the schema — unlisted hosts render a blocked
   * placeholder.
   */
  iframeAllowlist?: readonly string[];
  /**
   * Pages the current viewer can see, by id — resolves internal page
   * links' labels and hrefs at render time. Only affects rendering, not
   * the schema.
   */
  pages?: Readonly<Record<string, WikiPageLinkedPage>>;
  /**
   * Current handles of the citizens mentioned on the page, by id — resolves
   * citizen mentions' labels at render time. Only affects rendering, not
   * the schema.
   */
  citizens?: Readonly<Record<string, WikiMentionedCitizen>>;
}

/**
 * Shared lowlight instance — a static grammar registry, so one instance can
 * serve every editor. `common` (~35 grammars) instead of `all` keeps ~150
 * unused grammars out of the client bundle.
 */
const lowlight = createLowlight(common);

/**
 * The containers that hold grids next to regular blocks — grids live
 * outside the `block` group so grid cells cannot nest them (see
 * WIKI_GRID_HOST_CONTENT).
 */
const WikiDocument = Document.extend({ content: WIKI_GRID_HOST_CONTENT });

const WikiDetailsContent = DetailsContent.extend({
  content: WIKI_GRID_HOST_CONTENT,
});

/**
 * The wiki's Tiptap extensions. Shared between the editor, the static
 * renderer for readers and the server-side content validation so all three
 * always agree on the schema. All options only affect editor behavior or
 * rendering — never the schema itself.
 */
export const getWikiEditorExtensions = (
  options?: WikiEditorExtensionsOptions,
) => {
  return [
    StarterKit.configure({
      // Replaced with the lowlight-highlighted variant below
      codeBlock: false,
      // Replaced with the grid-hosting variant below
      document: false,
      // Replaced with the text-only variants below
      blockquote: false,
      heading: false,
      listItem: false,
      link: {
        openOnClick: false,
      },
      undoRedo: options?.collaboration ? false : undefined,
      dropcursor: {
        // Line color; the glow gradient comes from the class (wikiEditor.css)
        color: "var(--color-green-500)",
        width: 2,
        class: "wiki-drop-cursor",
      },
    }),
    WikiDocument,
    CodeBlockLowlight.configure({ lowlight }),
    WikiBlockquote,
    WikiHeading,
    WikiListItem,
    TableKit.configure({
      table: { resizable: false },
      // Replaced with the text-only variants below
      tableCell: false,
      tableHeader: false,
    }),
    WikiTableCell,
    WikiTableHeader,
    TaskList,
    WikiTaskItem.configure({ nested: true }),
    Details,
    DetailsSummary,
    WikiDetailsContent,
    WikiHighlight,
    // After the StarterKit marks so it renders as their innermost element,
    // letting its CSS color win over the typography plugin's strong/link
    // colors
    WikiTextColorMark,
    WikiTextAlign.configure({ types: ["heading", "paragraph"] }),
    WikiTextOnlyBlockGuard,
    WikiImage,
    WikiAttachment,
    WikiEmbed.configure({
      twitchParentHost: options?.twitchParentHost ?? "",
      iframeAllowlist: options?.iframeAllowlist ?? [],
    }),
    WikiPageLink.configure({
      pages: options?.pages ?? {},
    }),
    WikiPageIndex,
    WikiCitizenMention.configure({
      citizens: options?.citizens ?? {},
    }),
    WikiGrid,
    WikiGridCell,
    WikiCallout,
    WikiHeadingIds,
    Placeholder.configure({
      placeholder: "Diese Seite hat noch keinen Inhalt.",
      // Also cover the read-only view — same empty state in every mode
      showOnlyWhenEditable: false,
    }),
  ];
};

/**
 * The ProseMirror schema derived from the wiki's extensions, e.g. for
 * validating content server-side or converting between Yjs and ProseMirror
 * documents.
 */
export const getWikiEditorSchema = (): Schema =>
  getSchema(getWikiEditorExtensions());

/**
 * Name of the Yjs XML fragment holding the document content. Tiptap's
 * Collaboration extension uses "default"; every Yjs ⇄ ProseMirror
 * conversion (collab server persistence, ydoc regeneration on snapshot
 * restore/import) must use the same fragment name.
 */
export const WIKI_EDITOR_FRAGMENT = "default";
