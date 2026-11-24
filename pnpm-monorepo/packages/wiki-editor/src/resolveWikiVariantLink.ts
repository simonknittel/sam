export interface WikiVariantLogo {
  src: string;
  /** Consumers skip image optimization for SVG/GIF */
  mimeType: string;
}

export interface WikiLinkedVariant {
  name: string;
  manufacturerName: string;
  logo?: WikiVariantLogo;
}

export interface ResolvedWikiVariantLink {
  variantId: string;
  name: string;
  manufacturerName: string | null;
  logo: WikiVariantLogo | null;
}

/** A link pasted as a URL has no name until the map catches up. */
export const resolveWikiVariantLink = (
  variants: Readonly<Record<string, WikiLinkedVariant>>,
  attributes: Readonly<Record<string, unknown>>,
): ResolvedWikiVariantLink | null => {
  const variantId =
    typeof attributes.variantId === "string" ? attributes.variantId : "";
  const storedName =
    typeof attributes.name === "string" && attributes.name
      ? attributes.name
      : null;
  // The id is document content — keys like "constructor" must not resolve
  const variant = Object.hasOwn(variants, variantId)
    ? variants[variantId]
    : undefined;
  const name = variant?.name ?? storedName;

  if (!variantId || name === null) return null;
  return {
    variantId,
    name,
    manufacturerName: variant?.manufacturerName ?? null,
    logo: variant?.logo ?? null,
  };
};

/** Like `getVariantWikiRootPath()` of the domain package */
export const wikiVariantLinkHref = (variantId: string) =>
  `/app/fleet/variant/${encodeURIComponent(variantId)}`;
