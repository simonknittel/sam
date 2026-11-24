import {
  getApplicationContext,
  getRequestActor,
  throwApplicationErrorForPage,
} from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { findOwnShipsOfRequiredVariants } from "@sam-monorepo/application";
import type { Event } from "@sam-monorepo/database/client";
import { cache } from "react";

export const getMyShipsOfRequiredVariants = cache(
  withTrace("getMyShipsOfRequiredVariants", async (eventId: Event["id"]) => {
    try {
      return await findOwnShipsOfRequiredVariants(
        getApplicationContext(),
        await getRequestActor(),
        { eventId },
      );
    } catch (error) {
      return throwApplicationErrorForPage(error);
    }
  }),
);
