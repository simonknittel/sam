"use client";

import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Editor } from "@tiptap/react";

export interface WikiHighlightRange {
  readonly from: number;
  readonly to: number;
}

interface WikiHighlightMeta {
  readonly range: WikiHighlightRange | null;
}

const key = new PluginKey<WikiHighlightRange | null>("wikiActiveNodeHighlight");

/**
 * Highlights the block targeted by the gutter (wikiEditor.css) with a
 * background wash. Node decorations instead of direct classList mutations:
 * ProseMirror re-creates node DOM on redraws, which would drop a mutated
 * class, while decorations survive and map through (remote) edits.
 */
export const WikiActiveNodeHighlight = Extension.create({
  name: "wikiActiveNodeHighlight",

  addProseMirrorPlugins() {
    return [
      new Plugin<WikiHighlightRange | null>({
        key,
        state: {
          init: () => null,
          apply: (transaction, state) => {
            const meta = transaction.getMeta(key) as
              WikiHighlightMeta | undefined;
            if (meta) return meta.range;
            if (!transaction.docChanged || !state) return state;

            const from = transaction.mapping.map(state.from);
            const to = transaction.mapping.map(state.to);
            return from < to ? { from, to } : null;
          },
        },
        props: {
          decorations(editorState) {
            const range = this.getState(editorState);
            if (!range) return DecorationSet.empty;
            return DecorationSet.create(editorState.doc, [
              Decoration.node(range.from, range.to, {
                class: "wiki-gutter-highlight",
              }),
            ]);
          },
        },
      }),
    ];
  },
});

/** The gutter's background-washed block. No-ops when already set. */
export const setWikiGutterHighlight = (
  editor: Editor,
  range: WikiHighlightRange | null,
) => {
  if (editor.isDestroyed) return;
  const current = key.getState(editor.state) ?? null;
  const unchanged = range
    ? current?.from === range.from && current.to === range.to
    : current === null;
  if (unchanged) return;
  const meta: WikiHighlightMeta = { range };
  editor.view.dispatch(editor.state.tr.setMeta(key, meta));
};
