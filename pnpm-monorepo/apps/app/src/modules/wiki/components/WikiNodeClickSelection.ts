"use client";

import { Extension } from "@tiptap/core";
import { NodeSelection, Plugin, PluginKey } from "@tiptap/pm/state";

const ANCHOR_NODE_TYPES = [
  // Linked to the original file it displays
  "image",
  "wikiFloatImage",
  "wikiAttachment",
  "wikiPageLink",
  "wikiCitizenMention",
  "wikiVariantLink",
  // Renders a list of page links via its node view
  "wikiPageIndex",
  // Renders a list of citizen links via its node view
  "wikiRoleCitizens",
];

/**
 * The atom nodes in ANCHOR_NODE_TYPES (images, attachment cards, internal
 * page links, citizen mentions, variant links) render as anchors — while
 * editing, a plain click would navigate away. This selects the node
 * instead (showing the edit menu, which offers download/open); read-only
 * views keep the anchors' native navigation. Editor-only behavior, the
 * extension adds no schema.
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

          handleDOMEvents: {
            /**
             * ProseMirror runs handleClickOn on mouseup, where cancelling
             * the event is too late to stop the anchor: a link is followed
             * by the click event that comes after it. Cancelling that too
             * is what actually keeps the editor on the page — the node is
             * selected by then, so the selection identifies the click as
             * one of the handler's above.
             */
            click: (view, event) => {
              if (!view.editable) return false;
              const { selection } = view.state;
              if (
                !(selection instanceof NodeSelection) ||
                !ANCHOR_NODE_TYPES.includes(selection.node.type.name)
              )
                return false;

              event.preventDefault();
              return false;
            },
          },
        },
      }),
    ];
  },
});
