"use client";

import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Editor } from "@tiptap/react";

export interface WikiHighlightRange {
  readonly from: number;
  readonly to: number;
}

/** Writers of the highlight: the gutter and the contextual edit menu */
type WikiHighlightOwner = "gutter" | "menu";

interface WikiHighlightState {
  readonly range: WikiHighlightRange;
  readonly owner: WikiHighlightOwner;
}

interface WikiHighlightMeta {
  readonly range: WikiHighlightRange | null;
  readonly owner: WikiHighlightOwner;
}

const key = new PluginKey<WikiHighlightState | null>("wikiActiveNodeHighlight");

/**
 * Highlights the block the gutter or the edit menu currently targets
 * (wikiEditor.css) with a background wash. Node decorations instead of
 * direct classList mutations: ProseMirror re-creates node DOM on redraws,
 * which would drop a mutated class, while decorations survive and map
 * through (remote) edits.
 */
export const WikiActiveNodeHighlight = Extension.create({
  name: "wikiActiveNodeHighlight",

  addProseMirrorPlugins() {
    return [
      new Plugin<WikiHighlightState | null>({
        key,
        state: {
          init: () => null,
          apply: (transaction, state) => {
            const meta = transaction.getMeta(key) as
              WikiHighlightMeta | undefined;
            if (meta) {
              if (meta.range) return { range: meta.range, owner: meta.owner };
              /** A clear only removes the owner's own highlight */
              return state?.owner === meta.owner ? null : state;
            }
            if (!transaction.docChanged || !state) return state;

            const from = transaction.mapping.map(state.range.from);
            const to = transaction.mapping.map(state.range.to);
            return from < to
              ? { range: { from, to }, owner: state.owner }
              : null;
          },
        },
        props: {
          decorations(editorState) {
            const state = this.getState(editorState);
            if (!state) return DecorationSet.empty;
            return DecorationSet.create(editorState.doc, [
              Decoration.node(state.range.from, state.range.to, {
                class: "wiki-active-node-highlight",
              }),
            ]);
          },
        },
      }),
    ];
  },
});

/**
 * The background-washed block. No-ops when already set. Gutter and menu
 * react to the same pointer moves in an effect order neither controls —
 * owner-scoped clears keep one from wiping the highlight the other just
 * set.
 */
export const setWikiActiveNodeHighlight = (
  editor: Editor,
  range: WikiHighlightRange | null,
  owner: WikiHighlightOwner,
) => {
  if (editor.isDestroyed) return;
  const current = key.getState(editor.state) ?? null;
  const unchanged = range
    ? current?.owner === owner &&
      current.range.from === range.from &&
      current.range.to === range.to
    : current?.owner !== owner;
  if (unchanged) return;
  const meta: WikiHighlightMeta = { range, owner };
  editor.view.dispatch(editor.state.tr.setMeta(key, meta));
};
