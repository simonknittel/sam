"use client";

import { getWikiSelectionRestrictions } from "@sam-monorepo/wiki-editor";
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
  FaPhotoVideo,
  FaQuoteRight,
  FaSitemap,
  FaTable,
  FaTasks,
} from "react-icons/fa";
import {
  insertWikiFile,
  pickWikiFiles,
  WIKI_ATTACHMENT_ACCEPT,
  WIKI_IMAGE_ACCEPT,
} from "./wikiEditorFiles";
import { createWikiSuggestionRender } from "./WikiSuggestionMenu";

export interface WikiSlashCommandOptions {
  /** Id of the page being edited — target for file uploads */
  pageId: string;
  /** Opens the embed URL dialog (mounted by WikiCollabEditor) */
  onRequestEmbed: () => void;
  /** Opens the link dialog (mounted by WikiCollabEditor) */
  onRequestLink: () => void;
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
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).setParagraph().run(),
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
    run: (editor, range, options) => {
      editor.chain().focus().deleteRange(range).run();
      pickWikiFiles(WIKI_IMAGE_ACCEPT, (files) => {
        for (const file of files)
          void insertWikiFile(editor, options.pageId, file);
      });
    },
  },
  {
    title: "Dateianhang",
    icon: <FaPaperclip />,
    keywords: ["datei", "anhang", "attachment", "file", "pdf", "upload"],
    run: (editor, range, options) => {
      editor.chain().focus().deleteRange(range).run();
      pickWikiFiles(WIKI_ATTACHMENT_ACCEPT, (files) => {
        for (const file of files)
          void insertWikiFile(editor, options.pageId, file);
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
];

/** The palette entries applying at the caret, see WikiTextRestrictions */
const availableSlashCommandItems = (editor: Editor) => {
  const restrictions = getWikiSelectionRestrictions(editor.state);
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

const filterSlashCommandItems = (query: string, editor: Editor) => {
  return availableSlashCommandItems(editor).filter((item) =>
    matchesWikiSlashCommandQuery(item, query),
  );
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
      onRequestEmbed: () => undefined,
      onRequestLink: () => undefined,
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
          props.run(editor, range, this.options);
        },
        items: ({ query, editor }) => filterSlashCommandItems(query, editor),
        render: () => createWikiSuggestionRender<WikiSlashCommandItem>(),
      }),
    ];
  },
});
