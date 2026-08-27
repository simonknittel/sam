"use client";

import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { Mapping } from "@tiptap/pm/transform";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Editor } from "@tiptap/react";

export interface WikiHighlightRange {
  readonly from: number;
  readonly to: number;
}

/**
 * Writers of the highlight: the gutter while it is in use, the pointer
 * (wash of the block under it) and the focused block (the one whose
 * contextual edit menu is open). They write independently and may target
 * different blocks at the same time.
 */
export enum WikiHighlightOwner {
  Gutter = "gutter",
  Hover = "hover",
  Focus = "focus",
}

/** Class per owner — the focused block gets the stronger marker */
const OWNER_CLASS_NAMES: Readonly<Record<WikiHighlightOwner, string>> = {
  [WikiHighlightOwner.Gutter]: "wiki-active-node-highlight",
  [WikiHighlightOwner.Hover]: "wiki-active-node-highlight",
  [WikiHighlightOwner.Focus]: "wiki-focused-node-highlight",
};

type WikiHighlightState = Readonly<
  Partial<Record<WikiHighlightOwner, WikiHighlightRange>>
>;

interface WikiHighlightMeta {
  readonly range: WikiHighlightRange | null;
  readonly owner: WikiHighlightOwner;
}

const key = new PluginKey<WikiHighlightState>("wikiActiveNodeHighlight");

/** The range after `mapping` moved it, or NULL when it collapsed */
const mapRange = (
  range: WikiHighlightRange,
  mapping: Mapping,
): WikiHighlightRange | null => {
  const from = mapping.map(range.from);
  const to = mapping.map(range.to);
  return from < to ? { from, to } : null;
};

/**
 * Highlights the blocks the gutter, the pointer and the contextual edit
 * menu currently target (wikiEditor.css) with a background wash. Node
 * decorations instead of direct classList mutations: ProseMirror re-creates
 * node DOM on redraws, which would drop a mutated class, while decorations
 * survive and map through (remote) edits.
 */
export const WikiActiveNodeHighlight = Extension.create({
  name: "wikiActiveNodeHighlight",

  addProseMirrorPlugins() {
    return [
      new Plugin<WikiHighlightState>({
        key,
        state: {
          init: () => ({}),
          apply: (transaction, state) => {
            const meta = transaction.getMeta(key) as
              WikiHighlightMeta | undefined;
            if (meta)
              return { ...state, [meta.owner]: meta.range ?? undefined };
            if (!transaction.docChanged) return state;

            const mapped: Partial<
              Record<WikiHighlightOwner, WikiHighlightRange>
            > = {};
            for (const owner of Object.values(WikiHighlightOwner)) {
              const range = state[owner];
              const next = range ? mapRange(range, transaction.mapping) : null;
              if (next) mapped[owner] = next;
            }
            return mapped;
          },
        },
        props: {
          decorations(editorState) {
            const state = this.getState(editorState);
            if (!state) return DecorationSet.empty;

            const decorations = Object.values(WikiHighlightOwner).flatMap(
              (owner) => {
                const range = state[owner];
                return range
                  ? [
                      Decoration.node(range.from, range.to, {
                        class: OWNER_CLASS_NAMES[owner],
                      }),
                    ]
                  : [];
              },
            );
            return DecorationSet.create(editorState.doc, decorations);
          },
        },
      }),
    ];
  },
});

/**
 * The block an owner washes, NULL to remove its own wash. No-ops when the
 * owner already writes that range — the writers react to the same pointer
 * moves and transactions in an effect order none of them controls.
 */
export const setWikiActiveNodeHighlight = (
  editor: Editor,
  range: WikiHighlightRange | null,
  owner: WikiHighlightOwner,
) => {
  if (editor.isDestroyed) return;
  const current = key.getState(editor.state)?.[owner] ?? null;
  const unchanged = range
    ? current?.from === range.from && current.to === range.to
    : current === null;
  if (unchanged) return;
  const meta: WikiHighlightMeta = { range, owner };
  editor.view.dispatch(editor.state.tr.setMeta(key, meta));
};
