import { Extension } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import slug from "slug";
import {
  walkWikiContent,
  type WikiJsonContentNode,
} from "./walkWikiContent.js";

export interface WikiHeadingEntry {
  readonly id: string;
  readonly text: string;
  readonly level: number;
}

/**
 * Same slug rules as the app's page slugs (slugifyWikiPageTitle), so heading
 * anchors look consistent with page URLs.
 */
const slugifyWikiHeading = (text: string): string => {
  const result = slug(text, { locale: "de" }).slice(0, 64);
  return result || "-";
};

/**
 * Stateful anchor id assigner for one in-order pass over a document's
 * headings. The single source of truth for heading anchor ids: the slugified
 * heading text, deduplicated with a numeric suffix — and the one skip rule:
 * headings with empty/whitespace-only text get NO id (null). The TOC, the
 * static renderer and the live editor all assign ids through this, so
 * anchors always line up.
 */
export const createWikiHeadingIdAssigner = () => {
  const seen = new Map<string, number>();

  return (text: string): string | null => {
    const trimmed = text.trim();
    if (!trimmed) return null;
    const slugged = slugifyWikiHeading(trimmed);
    const count = seen.get(slugged) ?? 0;
    seen.set(slugged, count + 1);
    return count === 0 ? slugged : `${slugged}-${count + 1}`;
  };
};

const textOf = (node: WikiJsonContentNode): string => {
  const parts: string[] = [];
  if (typeof node.text === "string") parts.push(node.text);
  if (Array.isArray(node.content)) {
    for (const child of node.content)
      parts.push(textOf(child as WikiJsonContentNode));
  }
  return parts.join("");
};

/**
 * Collects the headings of a Tiptap JSON document in order, with their
 * anchor ids. Headings without text are skipped — they get no anchor
 * anywhere.
 */
export const getWikiHeadingEntries = (content: unknown): WikiHeadingEntry[] => {
  const entries: WikiHeadingEntry[] = [];
  const nextId = createWikiHeadingIdAssigner();

  walkWikiContent(content, (node) => {
    if (node.type !== "heading") return;
    const text = textOf(node).trim();
    const id = nextId(text);
    if (id === null) return;
    entries.push({
      id,
      text,
      level: typeof node.attrs?.level === "number" ? node.attrs.level : 1,
    });
  });

  return entries;
};

const buildWikiHeadingIdDecorations = (doc: ProseMirrorNode): DecorationSet => {
  const decorations: Decoration[] = [];
  const nextId = createWikiHeadingIdAssigner();

  doc.descendants((node, position) => {
    if (node.type.name !== "heading") return true;
    const id = nextId(node.textContent);
    if (id !== null)
      decorations.push(
        Decoration.node(position, position + node.nodeSize, { id }),
      );
    // Headings only contain inline content — no need to descend
    return false;
  });

  return DecorationSet.create(doc, decorations);
};

/**
 * Stamps the anchor ids onto the heading DOM of the live editor via node
 * decorations, so the TOC's `#anchor` links keep working while the editor
 * is mounted. Recomputed on every doc change — cheap at expected page
 * sizes.
 */
export const WikiHeadingIds = Extension.create({
  name: "wikiHeadingIds",

  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key: new PluginKey("wikiHeadingIds"),
        state: {
          init: (_config, state) => buildWikiHeadingIdDecorations(state.doc),
          apply: (transaction, decorations) =>
            transaction.docChanged
              ? buildWikiHeadingIdDecorations(transaction.doc)
              : decorations,
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});
