"use client";

import { api } from "@/modules/common/utils/api";
import {
  WikiPageIndex,
  normalizeWikiPageIndexConfig,
} from "@sam-monorepo/wiki-editor";
import type { AnyExtension } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import { WikiPageIndexList } from "./WikiPageIndexList";

interface WikiPageIndexNodeViewOptions {
  /** The page being edited/viewed — the root when `rootPageId` is null */
  currentPageId: string;
}

const WikiPageIndexNodeView = ({ node, extension }: NodeViewProps) => {
  const { currentPageId } = extension.options as WikiPageIndexNodeViewOptions;
  const config = normalizeWikiPageIndexConfig(node.attrs);

  const { data, isPending } = api.wiki.getPageIndex.useQuery(
    {
      pageId: currentPageId,
      mode: config.mode,
      rootPageId: config.rootPageId,
      maxDepth: config.maxDepth,
      tagIds: [...config.tagIds],
      matchMode: config.matchMode,
    },
    {
      refetchOnWindowFocus: false,
      placeholderData: (previous) => previous,
    },
  );

  return (
    <NodeViewWrapper>
      <WikiPageIndexList entries={data ?? []} isLoading={isPending} />
    </NodeViewWrapper>
  );
};

/**
 * The shared package's page-index node plus an editor-only React node view
 * fetching the resolved page list from the server, so editors and live
 * collab readers see the actual list instead of the placeholder. Same name,
 * attributes and schema — only the in-editor rendering differs, so save
 * validation, the collab server and the static renderer stay untouched by
 * this variant.
 */
const WikiPageIndexWithNodeView =
  WikiPageIndex.extend<WikiPageIndexNodeViewOptions>({
    addOptions() {
      return { currentPageId: "" };
    },

    addNodeView() {
      return ReactNodeViewRenderer(WikiPageIndexNodeView);
    },
  });

/**
 * Swaps the plain page-index node in an extension list for the node-view
 * variant, keeping its position in the list.
 */
export const withWikiPageIndexNodeView = (
  extensions: AnyExtension[],
  currentPageId: string,
): AnyExtension[] =>
  extensions.map((extension) =>
    extension.name === WikiPageIndex.name
      ? WikiPageIndexWithNodeView.configure({ currentPageId })
      : extension,
  );
