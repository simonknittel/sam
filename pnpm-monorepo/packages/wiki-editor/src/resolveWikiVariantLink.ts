export interface WikiVariantLogo {
  /**
   * Absolute URL of the manufacturer's logo. Resolved by the app so this
   * package needs no knowledge of the upload storage.
   */
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

/**
 * Resolves a variant link's label from its attributes and the variants
 * map — the current name wins, the name stored in the document is the
 * fallback (a link pasted as a URL has neither until the map catches up).
 * Null when neither is available.
 */
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

/** Where a variant link points — shared with the app's rendering */
export const wikiVariantLinkHref = (variantId: string) =>
  `/app/fleet/variant/${encodeURIComponent(variantId)}`;
