"use client";

import { Extension } from "@tiptap/core";
import { NodeSelection, Plugin, PluginKey } from "@tiptap/pm/state";

const ANCHOR_NODE_TYPES = [
  "wikiAttachment",
  "wikiPageLink",
  "wikiCitizenMention",
  // Renders a list of page links via its node view
  "wikiPageIndex",
];

/**
 * The atom nodes in ANCHOR_NODE_TYPES (attachment cards, internal page
 * links, citizen mentions) render as anchors — in the always-editable
 * editor a plain click would navigate away mid-editing. This selects the
 * node instead (showing the edit menu, which offers download/open).
 * Editor-only behavior, the extension adds no schema.
 */
export const WikiNodeClickSelection = Extension.create({
  name: "wikiNodeClickSelection",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("wikiNodeClickSelection"),
        props: {
          handleClickOn: (view, _position, node, nodePosition, event) => {
            if (!view.editable) return false;
            if (!ANCHOR_NODE_TYPES.includes(node.type.name)) return false;

            event.preventDefault();
            view.dispatch(
              view.state.tr.setSelection(
                NodeSelection.create(view.state.doc, nodePosition),
              ),
            );
            return true;
          },
        },
      }),
    ];
  },
});
