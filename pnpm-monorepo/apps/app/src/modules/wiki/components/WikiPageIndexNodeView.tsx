"use client";

import { api } from "@/trpc/react";
import {
  WikiPageIndex,
  normalizeWikiPageIndexConfig,
  wikiPageIndexConfigKey,
} from "@sam-monorepo/wiki-editor";
import type { AnyExtension } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import { useWikiPageHrefMode } from "./WikiPageHrefModeProvider";
import {
  WikiPageIndexList,
  type WikiPageIndexEntry,
} from "./WikiPageIndexList";
import { wikiNodeViewElementAttributes } from "./wikiNodeViewAttributes";

interface WikiPageIndexNodeViewOptions {
  /** The page being edited/viewed — the root when `rootPageId` is null */
  currentPageId: string;
  /**
   * Page lists resolved during the server render, keyed by
   * `wikiPageIndexConfigKey` — shown until the node view's own fetch lands,
   * so swapping in the editor doesn't flash a loading state over the static
   * fallback's list. Configs added or changed after the render miss here
   * and get the loading state.
   */
  initialEntries: Readonly<Record<string, WikiPageIndexEntry[]>>;
}

const WikiPageIndexNodeView = ({ node, extension }: NodeViewProps) => {
  const { currentPageId, initialEntries } =
    extension.options as WikiPageIndexNodeViewOptions;
  const { variantId } = useWikiPageHrefMode();
  const config = normalizeWikiPageIndexConfig(node.attrs);

  const { data, isPending } = api.wiki.getPageIndex.useQuery(
    {
      pageId: currentPageId,
      mode: config.mode,
      rootPageId: config.rootPageId,
      maxDepth: config.maxDepth,
      tagIds: [...config.tagIds],
      matchMode: config.matchMode,
      variantId: variantId ?? undefined,
    },
    {
      placeholderData: (previous) =>
        previous ?? initialEntries[wikiPageIndexConfigKey(node.attrs)],
    },
  );

  return (
    <NodeViewWrapper>
      <WikiPageIndexList entries={data ?? []} isLoading={isPending} />
    </NodeViewWrapper>
  );
};

const WikiPageIndexWithNodeView =
  WikiPageIndex.extend<WikiPageIndexNodeViewOptions>({
    addOptions() {
      return { currentPageId: "", initialEntries: {} };
    },

    addNodeView() {
      return ReactNodeViewRenderer(WikiPageIndexNodeView, {
        attrs: wikiNodeViewElementAttributes,
      });
    },
  });

export const withWikiPageIndexNodeView = (
  extensions: AnyExtension[],
  currentPageId: string,
  initialEntries: Readonly<Record<string, WikiPageIndexEntry[]>>,
): AnyExtension[] =>
  extensions.map((extension) =>
    extension.name === WikiPageIndex.name
      ? WikiPageIndexWithNodeView.configure({ currentPageId, initialEntries })
      : extension,
  );
