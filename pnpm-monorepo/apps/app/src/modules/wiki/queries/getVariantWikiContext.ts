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
 * Null when the embed does not exist for the viewer (see
 * `buildVariantWikiContext()`)
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
