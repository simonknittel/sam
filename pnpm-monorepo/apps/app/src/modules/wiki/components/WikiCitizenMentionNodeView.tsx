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

/**
 * The shared package's mention node plus an editor-only React node view, so
 * the citizen popover also shows while editing and in the live collab view
 * for readers. Same name, attributes and schema — only the in-editor
 * rendering differs, so save validation, the collab server and the static
 * renderer stay untouched by this variant.
 */
const WikiCitizenMentionWithPopover = WikiCitizenMention.extend({
  addNodeView() {
    return ReactNodeViewRenderer(WikiCitizenMentionNodeView);
  },
});

/**
 * Swaps the plain citizen mention node in an extension list for the
 * popover-enhanced variant, keeping its position in the list and its
 * configured options.
 */
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
