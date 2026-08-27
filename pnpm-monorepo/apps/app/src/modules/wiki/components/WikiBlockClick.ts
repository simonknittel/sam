"use client";

import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/react";

type WikiBlockClickListener = (event: MouseEvent) => void;

const listenersByEditor = new WeakMap<Editor, Set<WikiBlockClickListener>>();

/**
 * Subscribes to the clicks WikiBlockClick reports; returns the
 * unsubscribe function. A registry instead of an extension option: the
 * consumer (useWikiFocusedElement) lives far below the component creating
 * the editor, and re-configuring an extension recreates its plugins.
 */
export const onWikiBlockClick = (
  editor: Editor,
  listener: WikiBlockClickListener,
): (() => void) => {
  let listeners = listenersByEditor.get(editor);
  if (!listeners) {
    listeners = new Set();
    listenersByEditor.set(editor, listeners);
  }
  const registered = listeners;
  registered.add(listener);
  return () => registered.delete(listener);
};

/**
 * Reports plain left clicks inside the editor content to the subscribers
 * of onWikiBlockClick — the input of the focused-block state
 * (useWikiFocusedElement). ProseMirror's own click handling makes the
 * distinctions this needs: a drag that creates a text selection never
 * reaches these props, and neither does the second click of a
 * double-click (which selects a word instead).
 *
 * The raised priority puts these props before WikiNodeClickSelection's,
 * which answers handleClickOn with true for the anchor nodes and thereby
 * ends ProseMirror's handler chain for that click.
 */
export const WikiBlockClick = Extension.create({
  name: "wikiBlockClick",
  priority: 200,

  addProseMirrorPlugins() {
    const { editor } = this;

    /**
     * handleClickOn runs once per ancestor of the clicked node and
     * handleClick after it, while subscribers want one call per click —
     * the event object identifies it.
     */
    let reportedEvent: MouseEvent | null = null;
    const report = (event: MouseEvent): false => {
      if (event.button !== 0 || event === reportedEvent) return false;
      reportedEvent = event;
      for (const listener of listenersByEditor.get(editor) ?? [])
        listener(event);
      return false;
    };

    return [
      new Plugin({
        key: new PluginKey("wikiBlockClick"),
        props: {
          handleClickOn: (_view, _position, _node, _nodePosition, event) =>
            report(event),
          handleClick: (_view, _position, event) => report(event),
        },
      }),
    ];
  },
});
