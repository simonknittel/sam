import { mergeAttributes, Node, nodePasteRule } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    wikiPageLink: {
      /** Inserts an internal page link at the current position */
      setWikiPageLink: (attributes: { pageId: string }) => ReturnType;
    };
  }
}

export interface WikiPageLinkedPage {
  title: string;
  slug: string;
  /**
   * Absolute URL of the page's icon, if it has one. Resolved by the app so
   * this package needs no knowledge of the upload storage.
   */
  iconSrc?: string;
  /**
   * Route of the page, resolved by the app. Event wiki pages live under
   * their event, not under the global wiki route this node falls back to.
   */
  href?: string;
}

export interface WikiPageLinkOptions {
  /**
   * Pages the current viewer can see, by id. Pages missing from the map
   * (invisible or deleted) render as an unavailable placeholder without
   * leaking their title.
   */
  pages: Readonly<Record<string, WikiPageLinkedPage>>;
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
    const pageId = String(node.attrs.pageId ?? "");
    const page = this.options.pages[pageId];

    if (!page)
      return [
        "span",
        mergeAttributes({ "data-unavailable": "" }, HTMLAttributes),
        "Nicht verfügbare Seite",
      ];

    const children: (string | [string, Record<string, string>])[] = page.iconSrc
      ? [["img", { src: page.iconSrc, alt: "" }], page.title]
      : [page.title];

    return [
      "a",
      mergeAttributes(
        {
          href:
            page.href ??
            `/app/wiki/${encodeURIComponent(pageId)}/${encodeURIComponent(page.slug)}`,
        },
        HTMLAttributes,
      ),
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
