"use client";

import { api } from "@/trpc/react";
import type { WikiCitizen } from "@sam-monorepo/application";
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
import { wikiNodeViewElementAttributes } from "./wikiNodeViewAttributes";
import { WikiRoleCitizensList } from "./WikiRoleCitizensList";

interface WikiRoleCitizensNodeViewOptions {
  /**
   * Members resolved during the server render, keyed by role id (see
   * `initialEntries` of WikiPageIndexNodeView)
   */
  initialCitizens: Readonly<Record<string, WikiCitizen[]>>;
}

const WikiRoleCitizensNodeView = ({ node, extension }: NodeViewProps) => {
  const { initialCitizens } =
    extension.options as WikiRoleCitizensNodeViewOptions;
  const { roleId } = normalizeWikiRoleCitizensConfig(node.attrs);

  const { data, isPending } = api.wiki.getRoleCitizens.useQuery(
    { roleId: roleId ?? "" },
    {
      enabled: roleId !== null,
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

const WikiRoleCitizensWithNodeView =
  WikiRoleCitizens.extend<WikiRoleCitizensNodeViewOptions>({
    addOptions() {
      return { initialCitizens: {} };
    },

    addNodeView() {
      return ReactNodeViewRenderer(WikiRoleCitizensNodeView, {
        attrs: wikiNodeViewElementAttributes,
      });
    },
  });

export const withWikiRoleCitizensNodeView = (
  extensions: AnyExtension[],
  initialCitizens: Readonly<Record<string, WikiCitizen[]>>,
): AnyExtension[] =>
  extensions.map((extension) =>
    extension.name === WikiRoleCitizens.name
      ? WikiRoleCitizensWithNodeView.configure({ initialCitizens })
      : extension,
  );
