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
    ? data?.variants.find((variant) => variant.id === variantId)
    : undefined;
  const fetchedManufacturer = fetched
    ? data?.manufacturers.find(
        (manufacturer) => manufacturer.id === fetched.manufacturerId,
      )
    : undefined;

  const resolved =
    fetched && fetchedManufacturer
      ? {
          variantId,
          name: fetched.name,
          manufacturerName: fetchedManufacturer.name,
          logo: fetchedManufacturer.image
            ? {
                src: getWikiImageUrl(fetchedManufacturer.image.id),
                mimeType: fetchedManufacturer.image.mimeType,
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

const WikiVariantLinkWithNodeView = WikiVariantLink.extend({
  addNodeView() {
    return ReactNodeViewRenderer(WikiVariantLinkNodeView);
  },
});

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
