"use client";

import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Editor } from "@tiptap/react";

export interface WikiHighlightRange {
  readonly from: number;
  readonly to: number;
}

/**
 * Independent highlight slots — the edit menu and the gutter each control
 * their own without clearing the other's.
 */
type WikiHighlightSlot = "menu" | "gutter";

const SLOT_CLASS_NAMES: Record<WikiHighlightSlot, string> = {
  menu: "wiki-hover-highlight",
  gutter: "wiki-gutter-highlight",
};

type WikiHighlightState = Record<WikiHighlightSlot, WikiHighlightRange | null>;

interface WikiHighlightMeta {
  readonly slot: WikiHighlightSlot;
  readonly range: WikiHighlightRange | null;
}

const key = new PluginKey<WikiHighlightState>("wikiActiveNodeHighlight");

/**
 * Highlights nodes targeted by the editing UI (wikiEditor.css): the edit
 * menu's outline and the gutter's background wash. Node decorations
 * instead of direct classList mutations: ProseMirror re-creates node DOM
 * on redraws, which would drop a mutated class, while decorations survive
 * and map through (remote) edits.
 */
export const WikiActiveNodeHighlight = Extension.create({
  name: "wikiActiveNodeHighlight",

  addProseMirrorPlugins() {
    return [
      new Plugin<WikiHighlightState>({
        key,
        state: {
          init: () => ({ menu: null, gutter: null }),
          apply: (transaction, state) => {
            const meta = transaction.getMeta(key) as
              WikiHighlightMeta | undefined;
            if (meta) return { ...state, [meta.slot]: meta.range };
            if (!transaction.docChanged) return state;

            const mapRange = (range: WikiHighlightRange | null) => {
              if (!range) return null;
              const from = transaction.mapping.map(range.from);
              const to = transaction.mapping.map(range.to);
              return from < to ? { from, to } : null;
            };
            return {
              menu: mapRange(state.menu),
              gutter: mapRange(state.gutter),
            };
          },
        },
        props: {
          decorations(editorState) {
            const state = this.getState(editorState);
            if (!state) return DecorationSet.empty;
            const decorations = (
              Object.keys(SLOT_CLASS_NAMES) as WikiHighlightSlot[]
            ).flatMap((slot) => {
              const range = state[slot];
              return range
                ? [
                    Decoration.node(range.from, range.to, {
                      class: SLOT_CLASS_NAMES[slot],
                    }),
                  ]
                : [];
            });
            return DecorationSet.create(editorState.doc, decorations);
          },
        },
      }),
    ];
  },
});

const setSlot = (
  editor: Editor,
  slot: WikiHighlightSlot,
  range: WikiHighlightRange | null,
) => {
  if (editor.isDestroyed) return;
  const current = key.getState(editor.state)?.[slot] ?? null;
  const unchanged = range
    ? current?.from === range.from && current.to === range.to
    : current === null;
  if (unchanged) return;
  const meta: WikiHighlightMeta = { slot, range };
  editor.view.dispatch(editor.state.tr.setMeta(key, meta));
};

/** The edit menu's outlined node. No-ops when already set. */
export const setWikiActiveNodeHighlight = (
  editor: Editor,
  range: WikiHighlightRange | null,
) => setSlot(editor, "menu", range);

/** The gutter's background-washed block. No-ops when already set. */
export const setWikiGutterHighlight = (
  editor: Editor,
  range: WikiHighlightRange | null,
) => setSlot(editor, "gutter", range);
