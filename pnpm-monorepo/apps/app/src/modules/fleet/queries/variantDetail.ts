import {
  getApplicationContext,
  getRequestActor,
  throwApplicationErrorForPage,
} from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { findVariantDetail } from "@sam-monorepo/application";
import { cache } from "react";

export const getVariantDetail = cache(
  withTrace("getVariantDetail", async (variantId: string) => {
    try {
      return await findVariantDetail(
        getApplicationContext(),
        await getRequestActor(),
        { variantId },
      );
    } catch (error) {
      return throwApplicationErrorForPage(error);
    }
  }),
);
