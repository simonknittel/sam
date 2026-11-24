import {
  getApplicationContext,
  getRequestActor,
  throwApplicationErrorForPage,
} from "@/modules/application";
import { findManagedSeriesWithManufacturer } from "@sam-monorepo/application";
import { cache } from "react";

export const getSeriesAndManufacturerById = cache(
  async (seriesId: string, manufacturerId: string) => {
    try {
      return await findManagedSeriesWithManufacturer(
        getApplicationContext(),
        await getRequestActor(),
        { seriesId, manufacturerId },
      );
    } catch (error) {
      return throwApplicationErrorForPage(error);
    }
  },
);
