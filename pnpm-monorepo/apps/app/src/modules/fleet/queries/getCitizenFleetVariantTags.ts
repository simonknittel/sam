import {
  getApplicationContext,
  getRequestActor,
  throwApplicationErrorForPage,
} from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { findCitizenFleetVariantTags } from "@sam-monorepo/application";
import { cache } from "react";

export const getCitizenFleetVariantTags = cache(
  withTrace("getCitizenFleetVariantTags", async (citizenId: string) => {
    try {
      return await findCitizenFleetVariantTags(
        getApplicationContext(),
        await getRequestActor(),
        { citizenId },
      );
    } catch (error) {
      return throwApplicationErrorForPage(error);
    }
  }),
);
