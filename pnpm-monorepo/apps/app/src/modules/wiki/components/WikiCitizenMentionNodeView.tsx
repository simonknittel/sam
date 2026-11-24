"use client";

import {
  WikiCitizenMention,
  resolveWikiCitizenMention,
  type WikiCitizenMentionOptions,
  type WikiMentionedCitizen,
} from "@sam-monorepo/wiki-editor";
import type { AnyExtension } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import { WikiCitizenMentionChip } from "./WikiCitizenMentionChip";

const WikiCitizenMentionNodeView = ({ node, extension }: NodeViewProps) => {
  const { citizens } = extension.options as {
    citizens: Readonly<Record<string, WikiMentionedCitizen>>;
  };

  return (
    <NodeViewWrapper as="span">
      <WikiCitizenMentionChip
        resolved={resolveWikiCitizenMention(citizens, node.attrs)}
      />
    </NodeViewWrapper>
  );
};

const WikiCitizenMentionWithPopover = WikiCitizenMention.extend({
  addNodeView() {
    return ReactNodeViewRenderer(WikiCitizenMentionNodeView);
  },
});

export const withWikiCitizenMentionPopover = (
  extensions: AnyExtension[],
): AnyExtension[] =>
  extensions.map((extension) =>
    extension.name === WikiCitizenMention.name
      ? WikiCitizenMentionWithPopover.configure(
          extension.options as Partial<WikiCitizenMentionOptions>,
        )
      : extension,
  );
