import {
  getApplicationContext,
  getRequestActor,
  throwApplicationErrorForPage,
} from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { findSeriesVariantRows } from "@sam-monorepo/application";
import { cache } from "react";

export const getVariantsBySeriesId = cache(
  withTrace("getVariantsBySeriesId", async (seriesId: string) => {
    try {
      return await findSeriesVariantRows(
        getApplicationContext(),
        await getRequestActor(),
        { seriesId },
      );
    } catch (error) {
      return throwApplicationErrorForPage(error);
    }
  }),
);
