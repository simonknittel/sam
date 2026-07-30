"use client";

import { Extension, type Editor, type Range } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import { Suggestion } from "@tiptap/suggestion";
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
}

export interface WikiSlashCommandItem {
  readonly title: string;
  readonly keywords: readonly string[];
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
    keywords: ["text", "paragraph", "absatz", "p"],
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).setParagraph().run(),
  },
  ...([1, 2, 3] as const).map((level) => ({
    title: `Überschrift ${level}`,
    keywords: [`h${level}`, `heading${level}`, `überschrift${level}`],
    run: (editor: Editor, range: Range) =>
      editor.chain().focus().deleteRange(range).toggleHeading({ level }).run(),
  })),
  {
    title: "Liste",
    keywords: ["ul", "liste", "bullet", "list"],
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: "Nummerierte Liste",
    keywords: ["ol", "nummeriert", "ordered"],
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    title: "Aufgabenliste",
    keywords: ["todo", "task", "aufgabe", "checkbox"],
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleTaskList().run(),
  },
  {
    title: "Zitat",
    keywords: ["quote", "zitat", "blockquote"],
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    title: "Codeblock",
    keywords: ["code", "codeblock"],
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    title: "Tabelle",
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
    keywords: ["details", "toggle", "ausklappen", "accordion"],
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).setDetails().run(),
  },
  {
    title: "Hervorgehobener Block",
    keywords: ["callout", "info", "hinweis", "warnung", "note"],
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleWikiCallout("blue").run(),
  },
  ...([2, 3, 4] as const).map((columns) => ({
    title: `Raster mit ${columns} Spalten`,
    keywords: [
      `raster${columns}`,
      `grid${columns}`,
      `spalten${columns}`,
      "raster",
      "grid",
      "spalten",
      "columns",
    ],
    run: (editor: Editor, range: Range) =>
      editor.chain().focus().deleteRange(range).insertWikiGrid(columns).run(),
  })),
  {
    title: "Trennlinie",
    keywords: ["hr", "divider", "trennlinie", "linie"],
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
  {
    title: "Bild",
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
    title: "Seitenlink",
    keywords: ["seitenlink", "link", "seite", "page", "verweis"],
    /** "[[" opens the page link suggestion (WikiPageLinkSuggestion) */
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).insertContent("[[").run(),
  },
  {
    title: "Citizen erwähnen",
    keywords: ["citizen", "mention", "erwähnen", "erwähnung", "spieler"],
    /** "@" opens the citizen suggestion (WikiCitizenMentionSuggestion) */
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).insertContent("@").run(),
  },
];

const filterSlashCommandItems = (query: string) => {
  const normalized = query.toLowerCase().trim();
  if (!normalized) return [...WIKI_SLASH_COMMAND_ITEMS];
  return WIKI_SLASH_COMMAND_ITEMS.filter(
    (item) =>
      item.title.toLowerCase().includes(normalized) ||
      item.keywords.some((keyword) => keyword.startsWith(normalized)),
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
        items: ({ query }) => filterSlashCommandItems(query),
        render: () => createWikiSuggestionRender<WikiSlashCommandItem>(),
      }),
    ];
  },
});
