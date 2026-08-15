import { getSchema } from "@tiptap/core";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import {
  Details,
  DetailsContent,
  DetailsSummary,
} from "@tiptap/extension-details";
import { Document } from "@tiptap/extension-document";
import { HorizontalRule } from "@tiptap/extension-horizontal-rule";
import { BulletList, OrderedList, TaskList } from "@tiptap/extension-list";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Table, TableKit } from "@tiptap/extension-table";
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
import { WikiFloatImage } from "./wikiFloatImageNode.js";
import {
  WIKI_GRID_HOST_CONTENT,
  WikiGrid,
  WikiGridCell,
} from "./wikiGridNodes.js";
import { WikiHeadingIds } from "./wikiHeadingIds.js";
import { WikiHighlight } from "./wikiHighlightMark.js";
import { WikiImage } from "./wikiImageNode.js";
import { WikiPageIndex } from "./wikiPageIndexNode.js";
import { WikiPageLink, type WikiPageLinkedPage } from "./wikiPageLinkNode.js";
import {
  WIKI_NARROW_WIDTH_PX,
  WIKI_WIDE_WIDTH_PX,
  withWikiBlockLayout,
} from "./wikiResizableNodes.js";
import { WikiRoleCitizens } from "./wikiRoleCitizensNode.js";
import { WikiSmallTextMark } from "./wikiSmallTextMark.js";
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
import { WikiTextSize, withWikiTextSize } from "./wikiTextSize.js";
import {
  WikiVariantLink,
  type WikiLinkedVariant,
} from "./wikiVariantLinkNode.js";

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
  /**
   * Current names and manufacturer logos of the variants linked on the
   * page, by id — resolves variant links' labels at render time. Only
   * affects rendering, not the schema.
   */
  variants?: Readonly<Record<string, WikiLinkedVariant>>;
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
 * The stock block nodes plus the resizable width and block-position
 * attributes (wikiResizableNodes.ts). They replace their StarterKit and
 * TableKit variants below; the custom block nodes (callout, grid,
 * attachment, …) carry the attributes in their own definitions instead —
 * the app extends those exports directly (e.g. with node views), and an
 * assembly-time wrapper would be lost in that replacement. Space-hungry
 * blocks default to the wide preset instead of narrow. Paragraphs and
 * lists additionally carry the block-level text size (wikiTextSize.ts).
 */
const WikiParagraph = withWikiTextSize(withWikiBlockLayout(Paragraph));
const WikiBulletList = withWikiTextSize(withWikiBlockLayout(BulletList));
const WikiOrderedList = withWikiTextSize(withWikiBlockLayout(OrderedList));
const WikiTaskList = withWikiTextSize(withWikiBlockLayout(TaskList));
const WikiHorizontalRule = withWikiBlockLayout(HorizontalRule);
/**
 * Type conversions copy the source block's attributes (Tiptap's setNode),
 * so a paragraph toggled into a code block would keep the narrow width —
 * the commands override the width with the TARGET type's default in both
 * directions (wide for the code block, narrow for the paragraph it
 * toggles back into) unless the caller passes one explicitly. The ```
 * input rule is unaffected: it creates a fresh node, whose defaults
 * already apply. The casts widen the stock `{ language }` attribute type.
 */
const WikiCodeBlock = withWikiBlockLayout(
  CodeBlockLowlight,
  WIKI_WIDE_WIDTH_PX,
).extend({
  addCommands() {
    const parent = this.parent?.();
    return {
      ...parent,
      setCodeBlock: (attributes) => (props) =>
        parent?.setCodeBlock?.({
          widthPx: WIKI_WIDE_WIDTH_PX,
          ...attributes,
        } as {
          language: string;
        })(props) ?? false,
      toggleCodeBlock: (attributes) => (props) => {
        const widthPx = props.editor.isActive(this.name)
          ? WIKI_NARROW_WIDTH_PX
          : WIKI_WIDE_WIDTH_PX;
        return (
          parent?.toggleCodeBlock?.({ widthPx, ...attributes } as {
            language: string;
          })(props) ?? false
        );
      },
    };
  },
});
const WikiTable = withWikiBlockLayout(Table, WIKI_WIDE_WIDTH_PX);

/**
 * The stock Details node view applies the node's attributes (including
 * the layout styles) only on mount — its update() just tracks the open
 * state. Recreate the view whenever the layout attributes change so they
 * are re-applied.
 */
const WikiDetails = withWikiBlockLayout(Details).extend({
  addNodeView() {
    const createParentView = this.parent?.();
    if (!createParentView) return null;

    return (props) => {
      const view = createParentView(props);
      if (!view || typeof view !== "object" || !("update" in view)) return view;

      const parentUpdate = view.update?.bind(view);
      let renderedNode = props.node;
      view.update = (node, decorations, innerDecorations) => {
        const previous = renderedNode;
        renderedNode = node;
        if (
          node.attrs.widthPx !== previous.attrs.widthPx ||
          node.attrs.align !== previous.attrs.align
        )
          return false;
        return parentUpdate?.(node, decorations, innerDecorations) ?? false;
      };
      return view;
    };
  },
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
      // Replaced with the resizable variants below
      paragraph: false,
      bulletList: false,
      orderedList: false,
      horizontalRule: false,
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
    WikiParagraph,
    WikiBulletList,
    WikiOrderedList,
    WikiHorizontalRule,
    WikiCodeBlock.configure({ lowlight }),
    WikiBlockquote,
    WikiHeading,
    WikiListItem,
    TableKit.configure({
      // Replaced with the resizable variant below
      table: false,
      // Replaced with the text-only variants below
      tableCell: false,
      tableHeader: false,
    }),
    /**
     * No node view (View: NULL): the stock TableView manages the table's
     * inline width itself and ignores attribute updates, which would both
     * fight the layout attributes — without it the editor renders through
     * renderHTML like the static renderer (also meaning: no .tableWrapper
     * div in the editor DOM) and re-renders on attribute changes.
     */
    WikiTable.configure({ resizable: false, View: null }),
    WikiTableCell,
    WikiTableHeader,
    WikiTaskList,
    WikiTaskItem.configure({ nested: true }),
    WikiDetails,
    DetailsSummary,
    WikiDetailsContent,
    WikiHighlight,
    WikiSmallTextMark,
    // After the StarterKit marks so it renders as their innermost element,
    // letting its CSS color win over the typography plugin's strong/link
    // colors
    WikiTextColorMark,
    WikiTextAlign.configure({ types: ["heading", "paragraph"] }),
    WikiTextSize,
    WikiTextOnlyBlockGuard,
    WikiImage,
    WikiFloatImage,
    WikiAttachment,
    WikiEmbed.configure({
      twitchParentHost: options?.twitchParentHost ?? "",
      iframeAllowlist: options?.iframeAllowlist ?? [],
    }),
    WikiPageLink.configure({
      pages: options?.pages ?? {},
    }),
    WikiPageIndex,
    WikiRoleCitizens,
    WikiCitizenMention.configure({
      citizens: options?.citizens ?? {},
    }),
    WikiVariantLink.configure({
      variants: options?.variants ?? {},
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
