import {
  getApplicationContext,
  getRequestActor,
  throwApplicationErrorForPage,
} from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { findSpynetCitizen } from "@sam-monorepo/application";
import type { Citizen } from "@sam-monorepo/database/client";
import { cache } from "react";

/** The active citizen, or null */
export const getCitizenById = cache(
  withTrace("getCitizenById", async (id: Citizen["id"]) => {
    try {
      return await findSpynetCitizen(
        getApplicationContext(),
        await getRequestActor(),
        id,
      );
    } catch (error) {
      return throwApplicationErrorForPage(error);
    }
  }),
);
