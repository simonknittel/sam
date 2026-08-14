"use client";

import { Extension } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import { Suggestion } from "@tiptap/suggestion";
import {
  createWikiSuggestionRender,
  rankWikiSuggestionItems,
} from "./WikiSuggestionMenu";

interface WikiMentionableCitizen {
  readonly id: string;
  readonly handle: string | null;
}

interface WikiCitizenMentionSuggestionOptions {
  /**
   * Loads all mentionable citizens. Called on every keystroke of an open
   * suggestion — the implementation should cache (e.g. tRPC ensureData).
   */
  fetchCitizens: () => Promise<readonly WikiMentionableCitizen[]>;
}

interface CitizenMentionSuggestionItem {
  /** Citizen id — also the menu key, since handles are not guaranteed unique */
  readonly id: string;
  readonly handle: string;
  readonly title: string;
}

/**
 * Typing "@" opens a search over all citizens and inserts a citizen
 * mention. Editor-only — the extension adds no schema.
 */
export const WikiCitizenMentionSuggestion =
  Extension.create<WikiCitizenMentionSuggestionOptions>({
    name: "wikiCitizenMentionSuggestion",

    addOptions() {
      return {
        fetchCitizens: () => Promise.resolve([]),
      };
    },

    addProseMirrorPlugins() {
      return [
        Suggestion<CitizenMentionSuggestionItem, CitizenMentionSuggestionItem>({
          editor: this.editor,
          pluginKey: new PluginKey("wikiCitizenMentionSuggestion"),
          char: "@",
          allowSpaces: false,
          command: ({ editor, range, props }) => {
            editor
              .chain()
              .focus()
              .deleteRange(range)
              .insertContent([
                {
                  type: "wikiCitizenMention",
                  attrs: { citizenId: props.id, handle: props.handle },
                },
                { type: "text", text: " " },
              ])
              .run();
          },
          items: async ({ query }) => {
            const citizens = await this.options.fetchCitizens();
            return rankWikiSuggestionItems(
              citizens.flatMap((citizen) =>
                citizen.handle
                  ? [
                      {
                        id: citizen.id,
                        handle: citizen.handle,
                        title: citizen.handle,
                      },
                    ]
                  : [],
              ),
              query,
            );
          },
          render: () =>
            createWikiSuggestionRender<CitizenMentionSuggestionItem>(),
        }),
      ];
    },
  });
