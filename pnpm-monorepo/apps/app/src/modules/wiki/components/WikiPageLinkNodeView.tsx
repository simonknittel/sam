"use client";

import { api } from "@/trpc/react";
import {
  resolveWikiPageLink,
  WikiPageLink,
  type WikiPageLinkOptions,
} from "@sam-monorepo/wiki-editor";
import type { AnyExtension } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import {
  useWikiLinkablePagesInput,
  WIKI_LINKABLE_PAGES_STALE_TIME_MS,
} from "./wikiLinkablePages";

const WikiPageLinkNodeView = ({ node, extension }: NodeViewProps) => {
  const { pages } = extension.options as WikiPageLinkOptions;
  const pageId = typeof node.attrs.pageId === "string" ? node.attrs.pageId : "";

  /**
   * The map holds the pages the content linked to when the page rendered,
   * so links inserted since then — also by collaborators — are missing
   * from it. Those (and only those) look their page up in the scope's
   * linkable pages. One cached request serves every such link.
   */
  const isMissing = Boolean(pageId) && !Object.hasOwn(pages, pageId);
  const linkablePagesInput = useWikiLinkablePagesInput();
  const { data, isPending } = api.wiki.getLinkablePages.useQuery(
    linkablePagesInput,
    {
      enabled: isMissing,
      refetchOnReconnect: false,
      /** A cached list without the page can be older than the page itself */
      staleTime: (query) =>
        query.state.data && Object.hasOwn(query.state.data, pageId)
          ? WIKI_LINKABLE_PAGES_STALE_TIME_MS
          : 0,
    },
  );

  if (isMissing && isPending)
    return (
      <NodeViewWrapper as="span">
        <span
          data-wiki-page-link={pageId}
          aria-busy="true"
          title="Seite wird geladen"
          className="text-neutral-500"
        >
          …
        </span>
      </NodeViewWrapper>
    );

  const resolved = resolveWikiPageLink(
    isMissing ? (data ?? {}) : pages,
    node.attrs,
  );

  /** Same DOM as the node's renderHTML, which the CSS and copy/paste rely on */
  return (
    <NodeViewWrapper as="span">
      {resolved ? (
        <a data-wiki-page-link={resolved.pageId} href={resolved.href}>
          {resolved.iconSrc && (
            // eslint-disable-next-line @next/next/no-img-element -- wikiEditor.css scales the icon to the text
            <img src={resolved.iconSrc} alt="" />
          )}
          {resolved.title}
        </a>
      ) : (
        <span data-wiki-page-link={pageId || undefined} data-unavailable="">
          Nicht verfügbare Seite
        </span>
      )}
    </NodeViewWrapper>
  );
};

/**
 * The shared package's page link node plus an editor-only React node view
 * that also resolves links to pages outside the map the page rendered
 * with. Same name, attributes and schema — only the in-editor rendering
 * differs, so save validation, the collab server and the static renderer
 * stay untouched by this variant.
 */
const WikiPageLinkWithNodeView = WikiPageLink.extend({
  addNodeView() {
    return ReactNodeViewRenderer(WikiPageLinkNodeView);
  },
});

/**
 * Swaps the plain page link node in an extension list for the node-view
 * variant, keeping its position in the list and its configured options.
 */
export const withWikiPageLinkNodeView = (
  extensions: AnyExtension[],
): AnyExtension[] =>
  extensions.map((extension) =>
    extension.name === WikiPageLink.name
      ? WikiPageLinkWithNodeView.configure(
          extension.options as Partial<WikiPageLinkOptions>,
        )
      : extension,
  );
