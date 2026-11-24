import { getApplicationContext, getRequestActor } from "@/modules/application";
import {
  buildVariantWikiContext,
  type VariantWikiContext,
} from "@sam-monorepo/application";
import { cache } from "react";
import {
  createVariantWikiHrefMode,
  type WikiPageHrefMode,
} from "../utils/wikiPageHref";

/**
 * The gate of a variant's embedded wiki: routes, sidebar and section all
 * resolve through this. Returns null when
 * the embed does not exist for the viewer (see `buildVariantWikiContext()`),
 * so callers hide the section or 404 on null without leaking why. The href
 * mode is the one of the shared wiki components.
 */
export const getVariantWikiContext = cache(
  async (
    variantId: string,
  ): Promise<
    (VariantWikiContext & { readonly hrefMode: WikiPageHrefMode }) | null
  > => {
    const scope = await buildVariantWikiContext(
      getApplicationContext(),
      await getRequestActor(),
      variantId,
    );
    if (!scope) return null;

    return {
      ...scope,
      hrefMode: createVariantWikiHrefMode(scope.variant.id, scope.rootPage.id),
    };
  },
);
