"use client";

import type { WikiPageLinkedPage } from "@sam-monorepo/wiki-editor";
import { Extension } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import { Suggestion } from "@tiptap/suggestion";
import Image from "next/image";
import type { ReactNode } from "react";
import {
  createWikiSuggestionRender,
  rankWikiSuggestionItems,
} from "./WikiSuggestionMenu";

interface WikiPageLinkSuggestionOptions {
  /** Pages the current viewer can see, by id */
  pages: Readonly<Record<string, WikiPageLinkedPage>>;
}

interface PageLinkSuggestionItem {
  /** Page id — also the menu key, since page titles are not unique */
  readonly id: string;
  readonly title: string;
  readonly icon?: ReactNode;
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
                { type: "wikiPageLink", attrs: { pageId: props.id } },
                { type: "text", text: " " },
              ])
              .run();
          },
          items: ({ query }) =>
            rankWikiSuggestionItems(
              Object.entries(this.options.pages).map(([pageId, page]) => ({
                id: pageId,
                title: page.title,
                icon: page.iconSrc ? (
                  <Image
                    src={page.iconSrc}
                    alt=""
                    width={16}
                    height={16}
                    className="size-4 flex-none rounded-xs object-cover"
                    unoptimized
                  />
                ) : undefined,
              })),
              query,
            ),
          render: () => createWikiSuggestionRender<PageLinkSuggestionItem>(),
        }),
      ];
    },
  });
