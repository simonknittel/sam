"use client";

import { api } from "@/trpc/react";
import {
  WikiVariantLink,
  resolveWikiVariantLink,
  type WikiLinkedVariant,
  type WikiVariantLinkOptions,
} from "@sam-monorepo/wiki-editor";
import type { AnyExtension } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import { getWikiImageUrl } from "../utils/uploadWikiPageFile";
import { WikiVariantLinkChip } from "./WikiVariantLinkChip";

const WikiVariantLinkNodeView = ({ node, extension }: NodeViewProps) => {
  const { variants } = extension.options as {
    variants: Readonly<Record<string, WikiLinkedVariant>>;
  };

  const variantId =
    typeof node.attrs.variantId === "string" ? node.attrs.variantId : "";

  /**
   * The map is resolved when the page renders, so links inserted or
   * pasted since then are missing from it — those (and only those) look
   * their variant up client-side, which also gets them their logo. One
   * cached request serves every such chip on the page.
   */
  const isMissing = Boolean(variantId) && !variants[variantId];
  const { data } = api.variant.getAll.useQuery(undefined, {
    enabled: isMissing,
  });

  const fetched = isMissing
    ? data?.find((variant) => variant.id === variantId)
    : undefined;

  const resolved = fetched
    ? {
        variantId,
        name: fetched.name,
        manufacturerName: fetched.manufacturerName,
        logo: fetched.manufacturerImage
          ? {
              src: getWikiImageUrl(fetched.manufacturerImage.id),
              mimeType: fetched.manufacturerImage.mimeType,
            }
          : null,
      }
    : resolveWikiVariantLink(variants, node.attrs);

  return (
    <NodeViewWrapper as="span">
      <WikiVariantLinkChip resolved={resolved} />
    </NodeViewWrapper>
  );
};

/**
 * The shared package's variant link node plus an editor-only React node
 * view, so editors and live collab readers get the same chip as the static
 * render. Same name, attributes and schema — only the in-editor rendering
 * differs, so save validation, the collab server and the static renderer
 * stay untouched by this variant.
 */
const WikiVariantLinkWithNodeView = WikiVariantLink.extend({
  addNodeView() {
    return ReactNodeViewRenderer(WikiVariantLinkNodeView);
  },
});

/**
 * Swaps the plain variant link node in an extension list for the node-view
 * variant, keeping its position in the list and its configured options.
 */
export const withWikiVariantLinkNodeView = (
  extensions: AnyExtension[],
): AnyExtension[] =>
  extensions.map((extension) =>
    extension.name === WikiVariantLink.name
      ? WikiVariantLinkWithNodeView.configure(
          extension.options as Partial<WikiVariantLinkOptions>,
        )
      : extension,
  );
