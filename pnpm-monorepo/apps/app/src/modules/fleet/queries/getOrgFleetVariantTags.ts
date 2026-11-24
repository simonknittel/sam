import {
  getApplicationContext,
  getRequestActor,
  throwApplicationErrorForPage,
} from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { findOrgFleetVariantTags } from "@sam-monorepo/application";
import { cache } from "react";

export const getOrgFleetVariantTags = cache(
  withTrace("getOrgFleetVariantTags", async () => {
    try {
      return await findOrgFleetVariantTags(
        getApplicationContext(),
        await getRequestActor(),
      );
    } catch (error) {
      return throwApplicationErrorForPage(error);
    }
  }),
);
