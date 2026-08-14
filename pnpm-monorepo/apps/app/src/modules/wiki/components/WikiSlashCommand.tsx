"use client";

import {
  getWikiSelectionRestrictions,
  type WikiTextRestrictions,
} from "@sam-monorepo/wiki-editor";
import { Extension, type Editor, type Range } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import { Suggestion } from "@tiptap/suggestion";
import type { ReactNode } from "react";
import {
  FaAt,
  FaCaretSquareDown,
  FaCode,
  FaColumns,
  FaImage,
  FaInfoCircle,
  FaLink,
  FaListOl,
  FaListUl,
  FaMinus,
  FaPaperclip,
  FaParagraph,
  FaPaste,
  FaPhotoVideo,
  FaQuoteRight,
  FaSitemap,
  FaSpaceShuttle,
  FaTable,
  FaTasks,
  FaUsers,
} from "react-icons/fa";
import { getWikiNodeTypeLabel } from "../utils/getWikiNodeTypeLabel";
import { WikiUploadKind } from "../utils/uploadWikiPageFile";
import { getWikiCopiedBlock, type WikiCopiedBlock } from "./wikiBlockClipboard";
import {
  insertWikiFile,
  isWikiUploadKindAllowed,
  pickWikiFiles,
  WIKI_ATTACHMENT_ACCEPT,
  WIKI_IMAGE_ACCEPT,
  type WikiUploadPermissions,
} from "./wikiEditorFiles";
import { createWikiSuggestionRender } from "./WikiSuggestionMenu";

interface WikiSlashCommandOptions {
  /** Id of the page being edited — target for file uploads */
  pageId: string;
  /** Whether the viewer may upload images to the page */
  canUploadImages: boolean;
  /** Whether the viewer may upload file attachments to the page */
  canUploadAttachments: boolean;
  /** Opens the embed URL dialog (mounted by WikiCollabEditor) */
  onRequestEmbed: () => void;
  /** Opens the link dialog (mounted by WikiCollabEditor) */
  onRequestLink: () => void;
  /** Opens the ship picker (mounted by WikiCollabEditor) */
  onRequestVariantLink: () => void;
}

export interface WikiSlashCommandItem {
  readonly title: string;
  readonly icon: ReactNode;
  readonly keywords: readonly string[];
  /**
   * Whether the entry stays available inside a text-only container
   * (quote, table cell, list item) — only entries keeping the current
   * paragraph or inserting inline content qualify; everything
   * block-level is filtered out there.
   */
  readonly allowedInTextOnlyBlock?: boolean;
  /**
   * Whether the entry inserts inline nodes (page link, mention) — hidden
   * where those are schema-invalid (headings hold plain text only).
   */
  readonly insertsInline?: boolean;
  /**
   * Whether the entry inserts a grid — hidden inside grids (grids never
   * nest, not even indirectly via callouts or collapsible sections).
   */
  readonly insertsGrid?: boolean;
  /**
   * The upload kind the entry starts — entries of a kind the viewer may
   * not upload are shown disabled (applyWikiUploadRestrictions).
   */
  readonly uploadKind?: WikiUploadKind;
  /** Shown muted and inert; run is never called (WikiSuggestionMenu) */
  readonly disabled?: boolean;
  /** Secondary line under the title (the disabled entries' hint) */
  readonly subtitle?: string;
  /** Renders a divider below the entry (the pinned copied-block entry) */
  readonly dividerAfter?: boolean;
  readonly run: (
    editor: Editor,
    range: Range,
    options: WikiSlashCommandOptions,
  ) => void;
}

/** Shared with the gutter plus button (WikiGutter), which offers the same palette */
export const WIKI_SLASH_COMMAND_ITEMS: readonly WikiSlashCommandItem[] = [
  {
    title: "Text",
    icon: <FaParagraph />,
    keywords: ["text", "paragraph", "absatz", "p"],
    allowedInTextOnlyBlock: true,
    /**
     * setNode copies the block's attributes and merges the given ones on
     * top, so the size has to be passed in BOTH directions — a bare
     * setParagraph() would leave a small paragraph small. This entry is
     * therefore also the way back out of "Kleiner Text" inside quotes,
     * table cells and list items, where the type row is unavailable.
     */
    run: (editor, range) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode("paragraph", { textSize: null })
        .run(),
  },
  {
    title: "Kleiner Text",
    /** The same glyph as "Text" at a smaller size, like the type picker */
    icon: <FaParagraph className="text-[0.6rem]" />,
    keywords: ["klein", "small", "fein", "kleingedrucktes"],
    allowedInTextOnlyBlock: true,
    run: (editor, range) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode("paragraph", { textSize: "small" })
        .run(),
  },
  ...([1, 2, 3] as const).map((level) => ({
    title: `Überschrift ${level}`,
    /** Text badge like the toolbar's heading picker (has no svg icons) */
    icon: <span className="text-xs font-bold">H{level}</span>,
    keywords: [`h${level}`, `heading${level}`, `überschrift${level}`],
    run: (editor: Editor, range: Range) =>
      editor.chain().focus().deleteRange(range).toggleHeading({ level }).run(),
  })),
  {
    title: "Liste",
    icon: <FaListUl />,
    keywords: ["ul", "liste", "bullet", "list"],
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: "Nummerierte Liste",
    icon: <FaListOl />,
    keywords: ["ol", "nummeriert", "ordered"],
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    title: "Aufgabenliste",
    icon: <FaTasks />,
    keywords: ["todo", "task", "aufgabe", "checkbox"],
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleTaskList().run(),
  },
  {
    title: "Zitat",
    icon: <FaQuoteRight />,
    keywords: ["quote", "zitat", "blockquote"],
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    title: "Codeblock",
    icon: <FaCode />,
    keywords: ["code", "codeblock"],
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    title: "Tabelle",
    icon: <FaTable />,
    keywords: ["table", "tabelle"],
    run: (editor, range) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run(),
  },
  {
    title: "Ausklappbarer Abschnitt",
    icon: <FaCaretSquareDown />,
    keywords: ["details", "toggle", "ausklappen", "accordion"],
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).setDetails().run(),
  },
  {
    title: "Hervorgehobener Block",
    icon: <FaInfoCircle />,
    keywords: ["callout", "info", "hinweis", "warnung", "note"],
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleWikiCallout("blue").run(),
  },
  ...([2, 3, 4] as const).map((columns) => ({
    title: `Raster mit ${columns} Spalten`,
    icon: <FaColumns />,
    keywords: [
      `raster${columns}`,
      `grid${columns}`,
      `spalten${columns}`,
      "raster",
      "grid",
      "spalten",
      "columns",
    ],
    insertsGrid: true,
    run: (editor: Editor, range: Range) =>
      editor.chain().focus().deleteRange(range).insertWikiGrid(columns).run(),
  })),
  {
    title: "Trennlinie",
    icon: <FaMinus />,
    keywords: ["hr", "divider", "trennlinie", "linie"],
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
  {
    title: "Bild",
    icon: <FaImage />,
    keywords: ["bild", "image", "foto", "img"],
    uploadKind: WikiUploadKind.Image,
    run: (editor, range, options) => {
      editor.chain().focus().deleteRange(range).run();
      pickWikiFiles(WIKI_IMAGE_ACCEPT, (files) => {
        for (const file of files)
          void insertWikiFile(editor, options.pageId, options, file);
      });
    },
  },
  {
    title: "Dateianhang",
    icon: <FaPaperclip />,
    keywords: ["datei", "anhang", "attachment", "file", "pdf", "upload"],
    uploadKind: WikiUploadKind.Attachment,
    run: (editor, range, options) => {
      editor.chain().focus().deleteRange(range).run();
      pickWikiFiles(WIKI_ATTACHMENT_ACCEPT, (files) => {
        for (const file of files)
          void insertWikiFile(editor, options.pageId, options, file);
      });
    },
  },
  {
    title: "Einbetten",
    icon: <FaPhotoVideo />,
    keywords: [
      "einbetten",
      "embed",
      "youtube",
      "twitch",
      "spotify",
      "google",
      "iframe",
      "video",
      "website",
    ],
    run: (editor, range, options) => {
      editor.chain().focus().deleteRange(range).run();
      options.onRequestEmbed();
    },
  },
  {
    title: "Link",
    icon: <FaLink />,
    keywords: [
      "link",
      "seitenlink",
      "seite",
      "page",
      "url",
      "verweis",
      "verknüpfung",
    ],
    allowedInTextOnlyBlock: true,
    /**
     * Deliberately NOT insertsInline: the dialog also creates plain URL
     * links, which are valid where inline nodes (page links) are not —
     * it restricts itself to URLs there.
     */
    run: (editor, range, options) => {
      editor.chain().focus().deleteRange(range).run();
      options.onRequestLink();
    },
  },
  {
    title: "Schiff",
    icon: <FaSpaceShuttle />,
    keywords: [
      "schiff",
      "ship",
      "variante",
      "variant",
      "flotte",
      "fleet",
      "hersteller",
    ],
    allowedInTextOnlyBlock: true,
    insertsInline: true,
    run: (editor, range, options) => {
      editor.chain().focus().deleteRange(range).run();
      options.onRequestVariantLink();
    },
  },
  {
    title: "Citizen erwähnen",
    icon: <FaAt />,
    keywords: ["citizen", "mention", "erwähnen", "erwähnung", "spieler"],
    allowedInTextOnlyBlock: true,
    insertsInline: true,
    /** "@" opens the citizen suggestion (WikiCitizenMentionSuggestion) */
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).insertContent("@").run(),
  },
  {
    title: "Seitenverzeichnis",
    icon: <FaSitemap />,
    keywords: [
      "verzeichnis",
      "seitenverzeichnis",
      "seitenliste",
      "index",
      "toc",
      "inhaltsverzeichnis",
      "unterseiten",
      "tags",
    ],
    /** Defaults to the subtree of the current page; configurable via the edit menu */
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).setWikiPageIndex().run(),
  },
  {
    title: "Rollenmitglieder",
    icon: <FaUsers />,
    keywords: [
      "rolle",
      "rollen",
      "rollenmitglieder",
      "mitglieder",
      "role",
      "members",
      "citizens",
      "team",
    ],
    /** Starts without a role; picked in the edit menu's config dialog */
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).setWikiRoleCitizens().run(),
  },
];

const COPIED_BLOCK_TITLE = "Kopierten Block einfügen";

const COPIED_BLOCK_KEYWORDS = [
  "einfügen",
  "kopiert",
  "paste",
  "zwischenablage",
  "clipboard",
];

/**
 * Whether the copied block may be placed where the given restrictions
 * apply: leaves (code block, summary) take no nodes at all, text-only
 * containers (quote, table cell, list item) take paragraphs and inline
 * nodes, headings take no inline nodes, and grids never nest.
 */
const copiedBlockFitsRestrictions = (
  block: WikiCopiedBlock,
  restrictions: WikiTextRestrictions,
) => {
  if (restrictions.grids && block.containsGrid) return false;
  if (block.isInline) return !restrictions.inlineNodes;
  if (restrictions.slashItems === "none") return false;
  return !restrictions.blocks || block.typeName === "paragraph";
};

/**
 * The entry pasting the block captured by the edit menus' copy button
 * (wikiBlockClipboard), pinned above the regular entries in both palettes
 * (slash command, gutter plus button). NULL when nothing was copied, when
 * it may not be placed where the restrictions apply, or when it doesn't
 * match the query.
 */
export const getWikiCopiedBlockItem = (
  restrictions: WikiTextRestrictions,
  query: string,
  /** Set while regular entries follow below the pinned one */
  dividerAfter: boolean,
): WikiSlashCommandItem | null => {
  const block = getWikiCopiedBlock();
  if (!block || !copiedBlockFitsRestrictions(block, restrictions)) return null;

  const label = getWikiNodeTypeLabel(block.typeName, block.headingLevel);
  const item: WikiSlashCommandItem = {
    title: COPIED_BLOCK_TITLE,
    icon: <FaPaste />,
    /** The node type label makes the entry findable by what was copied */
    keywords: [...COPIED_BLOCK_KEYWORDS, label.toLowerCase()],
    subtitle: label,
    dividerAfter,
    /**
     * Block content replaces the (then empty) paragraph the palette was
     * invoked in, inline content lands inside it — both handled by
     * insertContent.
     */
    run: (editor, range) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent(block.content)
        .run(),
  };

  return matchesWikiSlashCommandQuery(item, query) ? item : null;
};

/** The palette entries applying where the restrictions apply, see WikiTextRestrictions */
const availableSlashCommandItems = (restrictions: WikiTextRestrictions) => {
  const items = WIKI_SLASH_COMMAND_ITEMS.filter(
    (item) => !(restrictions.grids && item.insertsGrid),
  );
  switch (restrictions.slashItems) {
    case "none":
      return [];
    case "textOnly":
      return items.filter((item) => item.allowedInTextOnlyBlock);
    case "noInline":
      return items.filter((item) => !item.insertsInline);
    default:
      return items;
  }
};

/**
 * Palette query matching shared with the gutter's insert palette:
 * case-insensitive substring on the title, prefix on the keywords.
 */
export const matchesWikiSlashCommandQuery = (
  item: WikiSlashCommandItem,
  query: string,
) => {
  const normalized = query.toLowerCase().trim();
  if (!normalized) return true;
  return (
    item.title.toLowerCase().includes(normalized) ||
    item.keywords.some((keyword) => keyword.startsWith(normalized))
  );
};

/**
 * Marks upload entries of a kind the viewer may not upload as disabled
 * with a hint — applied AFTER the availability filtering, so blocked
 * entries stay visible (but inert) wherever they would appear at all.
 * Shared with the gutter's insert palette.
 */
export const applyWikiUploadRestrictions = (
  items: readonly WikiSlashCommandItem[],
  permissions: WikiUploadPermissions,
): WikiSlashCommandItem[] =>
  items.map((item) =>
    item.uploadKind !== undefined &&
    !isWikiUploadKindAllowed(item.uploadKind, permissions)
      ? { ...item, disabled: true, subtitle: "Nur für Manager dieser Seite" }
      : item,
  );

const filterSlashCommandItems = (
  query: string,
  editor: Editor,
  permissions: WikiUploadPermissions,
) => {
  const restrictions = getWikiSelectionRestrictions(editor.state);
  const items = applyWikiUploadRestrictions(
    availableSlashCommandItems(restrictions),
    permissions,
  ).filter((item) => matchesWikiSlashCommandQuery(item, query));

  const copiedBlockItem = getWikiCopiedBlockItem(
    restrictions,
    query,
    items.length > 0,
  );
  return copiedBlockItem ? [copiedBlockItem, ...items] : items;
};

/**
 * Notion-like slash commands: typing "/" opens a filterable menu (e.g.
 * "/h1") that formats the current line or inserts blocks. Editor-only —
 * the extension adds no schema, so validation and static rendering are
 * unaffected.
 */
export const WikiSlashCommand = Extension.create<WikiSlashCommandOptions>({
  name: "wikiSlashCommand",

  addOptions() {
    return {
      pageId: "",
      canUploadImages: false,
      canUploadAttachments: false,
      onRequestEmbed: () => undefined,
      onRequestLink: () => undefined,
      onRequestVariantLink: () => undefined,
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion<WikiSlashCommandItem, WikiSlashCommandItem>({
        editor: this.editor,
        pluginKey: new PluginKey("wikiSlashCommand"),
        char: "/",
        allowSpaces: false,
        command: ({ editor, range, props }) => {
          if (props.disabled) return;
          props.run(editor, range, this.options);
        },
        items: ({ query, editor }) =>
          filterSlashCommandItems(query, editor, this.options),
        render: () => createWikiSuggestionRender<WikiSlashCommandItem>(),
      }),
    ];
  },
});
