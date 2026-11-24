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
import json from "highlight.js/lib/languages/json";
import markdown from "highlight.js/lib/languages/markdown";
import plaintext from "highlight.js/lib/languages/plaintext";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";
import { createLowlight } from "lowlight";
import type { WikiMentionedCitizen } from "./resolveWikiCitizenMention.js";
import type { WikiLinkedPages } from "./resolveWikiPageLink.js";
import type { WikiLinkedVariant } from "./resolveWikiVariantLink.js";
import { WikiAttachment } from "./wikiAttachmentNode.js";
import { WikiCallout } from "./wikiCalloutNode.js";
import { WikiCitizenMention } from "./wikiCitizenMentionNode.js";
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
import { WikiPageLink } from "./wikiPageLinkNode.js";
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
import { WikiVariantLink } from "./wikiVariantLinkNode.js";

export interface WikiEditorExtensionsOptions {
  /** Undo/redo comes from Yjs in the collab editor instead of StarterKit */
  collaboration?: boolean;
  /** See `WikiEmbedOptions` */
  twitchParentHost?: string;
  iframeAllowlist?: readonly string[];
  pages?: WikiLinkedPages;
  citizens?: Readonly<Record<string, WikiMentionedCitizen>>;
  variants?: Readonly<Record<string, WikiLinkedVariant>>;
}

/**
 * Shared lowlight instance — a static grammar registry, so one instance can
 * serve every editor. The wiki holds text and seldom code, and each grammar
 * goes into the bundle of each wiki page, thus only a few basic ones.
 */
const lowlight = createLowlight({ json, markdown, plaintext, xml, yaml });

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
 * renderer for readers, the Markdown renderer and parser, the collab server
 * and the server-side content validation so all of them always agree on the
 * schema. All options only affect editor behavior or rendering — never the
 * schema itself.
 *
 * A new node also needs entries in the app, which no compiler checks:
 * `NODE_TYPE_LABELS`, `MENU_NODE_TYPES`, `TARGET_SELECTOR`,
 * `ANCHOR_NODE_TYPES` (when it renders an anchor) and `nodeMapping` of the
 * static render (when it has a node view).
 */
export const getWikiEditorExtensions = (
  options?: WikiEditorExtensionsOptions,
) => {
  return [
    StarterKit.configure({
      codeBlock: false,
      document: false,
      blockquote: false,
      heading: false,
      listItem: false,
      paragraph: false,
      bulletList: false,
      orderedList: false,
      horizontalRule: false,
      link: {
        openOnClick: false,
      },
      undoRedo: options?.collaboration ? false : undefined,
      dropcursor: {
        color: "var(--color-green-500)",
        width: 2,
      },
    }),
    WikiDocument,
    WikiParagraph,
    WikiBulletList,
    WikiOrderedList,
    WikiHorizontalRule,
    // A block without a language stays plain text instead of a guess
    WikiCodeBlock.configure({ lowlight, defaultLanguage: "plaintext" }),
    WikiBlockquote,
    WikiHeading,
    WikiListItem,
    TableKit.configure({
      table: false,
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

export const getWikiEditorSchema = (): Schema =>
  getSchema(getWikiEditorExtensions());

/**
 * Name of the Yjs XML fragment holding the document content. Tiptap's
 * Collaboration extension uses "default"; every Yjs ⇄ ProseMirror
 * conversion (collab server persistence, ydoc regeneration on snapshot
 * restore/import) must use the same fragment name.
 */
export const WIKI_EDITOR_FRAGMENT = "default";
