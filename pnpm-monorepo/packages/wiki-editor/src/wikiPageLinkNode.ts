import { mergeAttributes, Node, nodePasteRule } from "@tiptap/core";
import {
  resolveWikiPageLink,
  type WikiLinkedPages,
} from "./resolveWikiPageLink.js";
import { walkWikiContent } from "./walkWikiContent.js";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    wikiPageLink: {
      /** Inserts an internal page link at the current position */
      setWikiPageLink: (attributes: { pageId: string }) => ReturnType;
    };
  }
}

export interface WikiPageLinkOptions {
  /**
   * Pages the current viewer can see, by id. Pages missing from the map
   * or null in it (invisible or deleted) render as an unavailable
   * placeholder without leaking their title.
   */
  pages: WikiLinkedPages;
}

/**
 * Matches pasted wiki page URLs (any host, /app/wiki/<id>[/<slug>]) so they
 * become page links instead of plain text.
 */
const PASTE_PATTERN = /https?:\/\/\S+\/app\/wiki\/([a-z0-9]{10,40})(?:\/\S*)?/g;

/**
 * Same for event wiki page URLs (/app/events/<eventId>/briefing/<pageId>).
 * Whether the resulting link resolves depends on the viewer's pages map
 * like everywhere else — a page of a foreign event renders as unavailable.
 * The bare briefing path is not matched: it carries no page id, and the
 * root page's id-URL redirects there anyway.
 */
const EVENT_PASTE_PATTERN =
  /https?:\/\/\S+\/app\/events\/[a-z0-9]{10,40}\/briefing\/([a-z0-9]{10,40})(?:\/\S*)?/g;

/**
 * An internal link to another wiki page. Only the page id is stored — the
 * title is looked up when rendering, so links follow renames and moves.
 */
export const WikiPageLink = Node.create<WikiPageLinkOptions>({
  name: "wikiPageLink",
  group: "inline",
  inline: true,
  atom: true,

  addOptions() {
    return {
      pages: {},
    };
  },

  addAttributes() {
    return {
      pageId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-wiki-page-link"),
        renderHTML: (attributes) =>
          attributes.pageId === null
            ? {}
            : { "data-wiki-page-link": String(attributes.pageId) },
      },
    };
  },

  parseHTML() {
    return [
      { tag: "a[data-wiki-page-link]" },
      { tag: "span[data-wiki-page-link]" },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const resolved = resolveWikiPageLink(this.options.pages, node.attrs);

    if (!resolved)
      return [
        "span",
        mergeAttributes({ "data-unavailable": "" }, HTMLAttributes),
        "Nicht verfügbare Seite",
      ];

    const children: (string | [string, Record<string, string>])[] =
      resolved.iconSrc
        ? [["img", { src: resolved.iconSrc, alt: "" }], resolved.title]
        : [resolved.title];

    return [
      "a",
      mergeAttributes({ href: resolved.href }, HTMLAttributes),
      ...children,
    ];
  },

  addCommands() {
    return {
      setWikiPageLink:
        (attributes) =>
        ({ commands }) => {
          return commands.insertContent({ type: this.name, attrs: attributes });
        },
    };
  },

  addPasteRules() {
    return [PASTE_PATTERN, EVENT_PASTE_PATTERN].map((pattern) =>
      nodePasteRule({
        find: pattern,
        type: this.type,
        getAttributes: (match) =>
          typeof match[1] === "string" ? { pageId: match[1] } : null,
      }),
    );
  },
});

/**
 * Collects the ids of all pages linked in a Tiptap JSON document, so only
 * their labels and routes have to be resolved before rendering.
 */
export const collectWikiPageLinkIds = (content: unknown): string[] => {
  const ids = new Set<string>();

  walkWikiContent(content, (node) => {
    if (
      node.type === "wikiPageLink" &&
      typeof node.attrs?.pageId === "string" &&
      node.attrs.pageId
    )
      ids.add(node.attrs.pageId);
  });

  return [...ids];
};
