import {
  getApplicationContext,
  getRequestActor,
  throwApplicationErrorForPage,
} from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { findOwnFleetVariantTags } from "@sam-monorepo/application";
import { cache } from "react";

export const getMyFleetVariantTags = cache(
  withTrace("getMyFleetVariantTags", async () => {
    try {
      return await findOwnFleetVariantTags(
        getApplicationContext(),
        await getRequestActor(),
      );
    } catch (error) {
      return throwApplicationErrorForPage(error);
    }
  }),
);
