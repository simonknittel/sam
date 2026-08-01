"use client";

import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

/**
 * In the read-only render the whole collapsible header toggles its section,
 * matching the native <details> of the static render — clicks anywhere on
 * the summary are forwarded to the node view's toggle button, which owns
 * the open/close logic (wikiEditor.css takes that button out of hit testing
 * there). While editing, clicks must keep placing the cursor into the
 * summary text, so this only acts in read-only editors.
 */
export const WikiDetailsSummaryToggle = Extension.create({
  name: "wikiDetailsSummaryToggle",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("wikiDetailsSummaryToggle"),
        props: {
          handleDOMEvents: {
            click: (view, event) => {
              if (view.editable) return false;
              if (!(event.target instanceof Element)) return false;

              const summary = event.target.closest("summary");
              if (!summary || !view.dom.contains(summary)) return false;

              const toggle = summary
                .closest('[data-type="details"]')
                ?.querySelector(":scope > button");
              if (!(toggle instanceof HTMLButtonElement)) return false;

              event.preventDefault();
              toggle.click();
              return true;
            },
          },
        },
      }),
    ];
  },
});
