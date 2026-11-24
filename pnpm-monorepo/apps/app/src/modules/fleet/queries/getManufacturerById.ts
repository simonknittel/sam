import {
  getApplicationContext,
  getRequestActor,
  throwApplicationErrorForPage,
} from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { findManagedManufacturer } from "@sam-monorepo/application";
import { cache } from "react";

export const getManufacturerById = cache(
  withTrace("getManufacturerById", async (manufacturerId: string) => {
    try {
      return await findManagedManufacturer(
        getApplicationContext(),
        await getRequestActor(),
        { manufacturerId },
      );
    } catch (error) {
      return throwApplicationErrorForPage(error);
    }
  }),
);
