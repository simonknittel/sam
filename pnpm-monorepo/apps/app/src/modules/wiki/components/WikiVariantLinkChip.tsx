import { VariantWithLogo } from "@/modules/fleet/components/VariantWithLogo";
import {
  wikiVariantLinkHref,
  type ResolvedWikiVariantLink,
} from "@sam-monorepo/wiki-editor/helpers";

interface Props {
  readonly resolved: ResolvedWikiVariantLink | null;
}

/**
 * The rendered variant link: the fleet app's variant component scaled to
 * the surrounding text, inside a link to the variant's page. Shared
 * between the static render for readers and the editor node view
 * (WikiVariantLinkNodeView) so both look the same. The anchor mirrors the
 * node's renderHTML (data attribute included) so copying it back into the
 * editor still parses as the node — and so the edit menu recognizes it as
 * this node instead of a plain link. Loads no editor code.
 */
export const WikiVariantLinkChip = ({ resolved }: Props) => {
  if (!resolved)
    return (
      <span data-wiki-variant-link="" data-unavailable="">
        Nicht verfügbares Schiff
      </span>
    );

  return (
    <a
      data-wiki-variant-link={resolved.variantId}
      href={wikiVariantLinkHref(resolved.variantId)}
    >
      <VariantWithLogo
        variant={{ id: resolved.variantId, name: resolved.name }}
        manufacturer={{ name: resolved.manufacturerName ?? "" }}
        logo={resolved.logo}
        size="inline"
        /** The chip's own anchor carries the node marker */
        disableLink
      />
    </a>
  );
};
