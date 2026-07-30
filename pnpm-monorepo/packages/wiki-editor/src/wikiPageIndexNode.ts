import { mergeAttributes, Node } from "@tiptap/core";
import { walkWikiContent } from "./walkWikiContent.js";

export const WIKI_PAGE_INDEX_MODES = ["tree", "tags"] as const;
export type WikiPageIndexMode = (typeof WIKI_PAGE_INDEX_MODES)[number];

export const WIKI_PAGE_INDEX_MATCH_MODES = ["all", "any"] as const;
export type WikiPageIndexMatchMode =
  (typeof WIKI_PAGE_INDEX_MATCH_MODES)[number];

export const WIKI_PAGE_INDEX_MAX_TAGS = 20;
export const WIKI_PAGE_INDEX_MAX_DEPTH = 99;

/**
 * The node's configuration. The document only ever stores this config —
 * the listed pages are resolved per viewer at render time (editor node view
 * and static renderer alike) and never become part of the content.
 */
export interface WikiPageIndexConfig {
  readonly mode: WikiPageIndexMode;
  /** Root page for tree mode; null = the page containing the node */
  readonly rootPageId: string | null;
  /** Tree depth to render; null = unlimited */
  readonly maxDepth: number | null;
  /** Tags for tag mode */
  readonly tagIds: readonly string[];
  /** "all" = page must carry every tag (AND), "any" = at least one (OR) */
  readonly matchMode: WikiPageIndexMatchMode;
}

/**
 * Clamps arbitrary (user-controlled) attribute input into a valid config.
 * Shared by the node's attribute parsing, the server-side resolution and
 * the render-time config key so all of them agree.
 */
export const normalizeWikiPageIndexConfig = (
  attrs: Readonly<Record<string, unknown>> | undefined,
): WikiPageIndexConfig => {
  const mode = WIKI_PAGE_INDEX_MODES.includes(attrs?.mode as WikiPageIndexMode)
    ? (attrs?.mode as WikiPageIndexMode)
    : "tree";

  const rootPageId =
    typeof attrs?.rootPageId === "string" && attrs.rootPageId.length > 0
      ? attrs.rootPageId
      : null;

  const maxDepthRaw = Number(attrs?.maxDepth);
  const maxDepth =
    Number.isInteger(maxDepthRaw) && maxDepthRaw >= 1
      ? Math.min(maxDepthRaw, WIKI_PAGE_INDEX_MAX_DEPTH)
      : null;

  const tagIds = Array.isArray(attrs?.tagIds)
    ? attrs.tagIds
        .filter(
          (tagId): tagId is string =>
            typeof tagId === "string" && tagId.length > 0,
        )
        .slice(0, WIKI_PAGE_INDEX_MAX_TAGS)
    : [];

  const matchMode = WIKI_PAGE_INDEX_MATCH_MODES.includes(
    attrs?.matchMode as WikiPageIndexMatchMode,
  )
    ? (attrs?.matchMode as WikiPageIndexMatchMode)
    : "all";

  return { mode, rootPageId, maxDepth, tagIds, matchMode };
};

/**
 * Stable key for a node's config, e.g. to look up the pre-resolved page
 * list during static rendering. Tag order does not matter.
 */
export const wikiPageIndexConfigKey = (
  attrs: Readonly<Record<string, unknown>> | undefined,
): string => {
  const config = normalizeWikiPageIndexConfig(attrs);
  return JSON.stringify([
    config.mode,
    config.rootPageId,
    config.maxDepth,
    [...config.tagIds].sort(),
    config.matchMode,
  ]);
};

/**
 * All distinct page-index configs of a Tiptap JSON document, keyed for
 * `wikiPageIndexConfigKey` lookups — so the server can resolve every index
 * on a page before rendering it statically.
 */
export const collectWikiPageIndexConfigs = (
  content: unknown,
): { key: string; config: WikiPageIndexConfig }[] => {
  const byKey = new Map<string, WikiPageIndexConfig>();
  walkWikiContent(content, (node) => {
    if (node.type !== "wikiPageIndex") return;
    byKey.set(
      wikiPageIndexConfigKey(node.attrs),
      normalizeWikiPageIndexConfig(node.attrs),
    );
  });
  return [...byKey.entries()].map(([key, config]) => ({ key, config }));
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    wikiPageIndex: {
      /** Inserts a page index ("Seitenverzeichnis") at the current position */
      setWikiPageIndex: (
        attributes?: Partial<WikiPageIndexConfig>,
      ) => ReturnType;
    };
  }
}

/**
 * A block listing wiki pages — either the subtree below a root page or all
 * pages carrying certain tags. The node stores configuration only; the page
 * list is resolved per viewer at render time (and is permission-filtered
 * server-side), so it never leaks into the document, `searchText` or the
 * clipboard. It deliberately ignores the pages' sidebar mode — an index on
 * a "dataset" page is how sidebar-hidden child pages get surfaced.
 */
export const WikiPageIndex = Node.create({
  name: "wikiPageIndex",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      mode: {
        default: "tree",
        parseHTML: (element) =>
          normalizeWikiPageIndexConfig({
            mode: element.getAttribute("data-mode"),
          }).mode,
        renderHTML: (attributes) => ({
          "data-mode": String(attributes.mode),
        }),
      },
      rootPageId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-root-page-id"),
        renderHTML: (attributes) =>
          attributes.rootPageId === null
            ? {}
            : { "data-root-page-id": String(attributes.rootPageId) },
      },
      maxDepth: {
        default: null,
        parseHTML: (element) =>
          normalizeWikiPageIndexConfig({
            maxDepth: element.getAttribute("data-max-depth"),
          }).maxDepth,
        renderHTML: (attributes) =>
          attributes.maxDepth === null
            ? {}
            : { "data-max-depth": String(attributes.maxDepth) },
      },
      tagIds: {
        default: [],
        parseHTML: (element) =>
          normalizeWikiPageIndexConfig({
            // Tag ids are cuids and can never contain commas
            tagIds: (element.getAttribute("data-tag-ids") ?? "").split(","),
          }).tagIds,
        renderHTML: (attributes) => {
          const tagIds = Array.isArray(attributes.tagIds)
            ? (attributes.tagIds as string[])
            : [];
          return tagIds.length > 0 ? { "data-tag-ids": tagIds.join(",") } : {};
        },
      },
      matchMode: {
        default: "all",
        parseHTML: (element) =>
          normalizeWikiPageIndexConfig({
            matchMode: element.getAttribute("data-match-mode"),
          }).matchMode,
        renderHTML: (attributes) => ({
          "data-match-mode": String(attributes.matchMode),
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-wiki-page-index]" }];
  },

  /**
   * Fallback rendering (e.g. clipboard serialization) — the app overrides
   * this with a resolved page list via node view and static node mapping.
   */
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes({ "data-wiki-page-index": "" }, HTMLAttributes),
      "Seitenverzeichnis",
    ];
  },

  addCommands() {
    return {
      setWikiPageIndex:
        (attributes) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              ...normalizeWikiPageIndexConfig(undefined),
              ...attributes,
            },
          });
        },
    };
  },
});
