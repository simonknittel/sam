"use client";

import type { WikiPageLinkedPage } from "@sam-monorepo/wiki-editor";
import { Extension } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import { Suggestion } from "@tiptap/suggestion";
import {
  createWikiSuggestionRender,
  rankWikiSuggestionItems,
} from "./WikiSuggestionMenu";

interface WikiPageLinkSuggestionOptions {
  /** Pages the current viewer can see, by id */
  pages: Readonly<Record<string, WikiPageLinkedPage>>;
}

interface PageLinkSuggestionItem {
  readonly pageId: string;
  readonly title: string;
}

/**
 * Typing "[[" opens a search over all visible pages and inserts an
 * internal page link. Editor-only — the extension adds no schema.
 */
export const WikiPageLinkSuggestion =
  Extension.create<WikiPageLinkSuggestionOptions>({
    name: "wikiPageLinkSuggestion",

    addOptions() {
      return {
        pages: {},
      };
    },

    addProseMirrorPlugins() {
      return [
        Suggestion<PageLinkSuggestionItem, PageLinkSuggestionItem>({
          editor: this.editor,
          pluginKey: new PluginKey("wikiPageLinkSuggestion"),
          char: "[[",
          allowSpaces: true,
          command: ({ editor, range, props }) => {
            editor
              .chain()
              .focus()
              .deleteRange(range)
              .insertContent([
                { type: "wikiPageLink", attrs: { pageId: props.pageId } },
                { type: "text", text: " " },
              ])
              .run();
          },
          items: ({ query }) =>
            rankWikiSuggestionItems(
              Object.entries(this.options.pages).map(([pageId, page]) => ({
                pageId,
                title: page.title,
              })),
              query,
            ),
          render: () => createWikiSuggestionRender<PageLinkSuggestionItem>(),
        }),
      ];
    },
  });
