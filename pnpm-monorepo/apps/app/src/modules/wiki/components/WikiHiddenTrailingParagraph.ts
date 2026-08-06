"use client";

import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { findWikiTrailingEmptyParagraph } from "../utils/wikiTrailingParagraph";

/**
 * Hides the document's trailing empty paragraph (wikiTrailingParagraph.ts)
 * while reading, matching the static render. Only registered for the
 * read-only editor — while editing, that paragraph is the append
 * affordance it exists for.
 *
 * A decoration rather than a document change: read-only clients must not
 * produce collab updates. Recomputed per state instead of kept in plugin
 * state — it is a single lookup at the document's end.
 */
export const WikiHiddenTrailingParagraph = Extension.create({
  name: "wikiHiddenTrailingParagraph",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("wikiHiddenTrailingParagraph"),
        props: {
          decorations(state) {
            const range = findWikiTrailingEmptyParagraph(state.doc);
            if (!range) return DecorationSet.empty;
            return DecorationSet.create(state.doc, [
              Decoration.node(range.from, range.to, {
                class: "wiki-hidden-trailing-paragraph",
              }),
            ]);
          },
        },
      }),
    ];
  },
});
