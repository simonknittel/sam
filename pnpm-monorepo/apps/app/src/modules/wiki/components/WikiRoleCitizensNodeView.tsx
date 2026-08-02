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
import {
  WikiRoleCitizensList,
  type WikiRoleCitizen,
} from "./WikiRoleCitizensList";

interface WikiRoleCitizensNodeViewOptions {
  /**
   * Members resolved during the server render, keyed by role id — shown
   * until the node view's own fetch lands, so swapping in the editor
   * doesn't flash a loading state over the static fallback's list. Roles
   * selected after the render miss here and get the loading state.
   */
  initialCitizens: Readonly<Record<string, WikiRoleCitizen[]>>;
}

const WikiRoleCitizensNodeView = ({ node, extension }: NodeViewProps) => {
  const { initialCitizens } =
    extension.options as WikiRoleCitizensNodeViewOptions;
  const { roleId } = normalizeWikiRoleCitizensConfig(node.attrs);

  const { data, isPending } = api.wiki.getRoleCitizens.useQuery(
    { roleId: roleId ?? "" },
    {
      enabled: roleId !== null,
      refetchOnWindowFocus: false,
      placeholderData: (previous) =>
        previous ?? (roleId ? initialCitizens[roleId] : undefined),
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
const WikiRoleCitizensWithNodeView =
  WikiRoleCitizens.extend<WikiRoleCitizensNodeViewOptions>({
    addOptions() {
      return { initialCitizens: {} };
    },

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
  initialCitizens: Readonly<Record<string, WikiRoleCitizen[]>>,
): AnyExtension[] =>
  extensions.map((extension) =>
    extension.name === WikiRoleCitizens.name
      ? WikiRoleCitizensWithNodeView.configure({ initialCitizens })
      : extension,
  );
