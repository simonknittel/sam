import { getApplicationContext, getRequestActor } from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { canLinkVariantWikiPage } from "@sam-monorepo/application";

/** See `canLinkVariantWikiPage()` */
export const getCanLinkVariantWikiPage = withTrace(
  "getCanLinkVariantWikiPage",
  async (variantId: string) =>
    canLinkVariantWikiPage(getApplicationContext(), await getRequestActor(), {
      variantId,
    }),
);
