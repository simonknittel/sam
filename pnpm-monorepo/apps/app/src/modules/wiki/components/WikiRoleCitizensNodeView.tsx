"use client";

import { api } from "@/modules/common/utils/api";
import {
  WikiRoleCitizens,
  normalizeWikiRoleCitizensConfig,
} from "@sam-monorepo/wiki-editor";
import type { AnyExtension } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import { WikiRoleCitizensList } from "./WikiRoleCitizensList";

const WikiRoleCitizensNodeView = ({ node }: NodeViewProps) => {
  const { roleId } = normalizeWikiRoleCitizensConfig(node.attrs);

  const { data, isPending } = api.wiki.getRoleCitizens.useQuery(
    { roleId: roleId ?? "" },
    {
      enabled: roleId !== null,
      refetchOnWindowFocus: false,
      placeholderData: (previous) => previous,
    },
  );

  return (
    <NodeViewWrapper>
      <WikiRoleCitizensList
        roleId={roleId}
        citizens={data ?? []}
        isLoading={roleId !== null && isPending}
      />
    </NodeViewWrapper>
  );
};

/**
 * The shared package's role-members node plus an editor-only React node view
 * fetching the resolved citizens from the server, so editors and live collab
 * readers see the actual members instead of the placeholder. Same name,
 * attributes and schema — only the in-editor rendering differs, so save
 * validation, the collab server and the static renderer stay untouched by
 * this variant.
 */
const WikiRoleCitizensWithNodeView = WikiRoleCitizens.extend({
  addNodeView() {
    return ReactNodeViewRenderer(WikiRoleCitizensNodeView);
  },
});

/**
 * Swaps the plain role-members node in an extension list for the node-view
 * variant, keeping its position in the list.
 */
export const withWikiRoleCitizensNodeView = (
  extensions: AnyExtension[],
): AnyExtension[] =>
  extensions.map((extension) =>
    extension.name === WikiRoleCitizens.name
      ? WikiRoleCitizensWithNodeView
      : extension,
  );
