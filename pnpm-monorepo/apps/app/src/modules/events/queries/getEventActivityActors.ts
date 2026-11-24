import {
  getApplicationContext,
  getRequestActor,
  throwApplicationErrorForPage,
} from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { findEventActivityActors } from "@sam-monorepo/application";
import type { Event } from "@sam-monorepo/database/client";
import { cache } from "react";

export const getEventActivityActors = cache(
  withTrace("getEventActivityActors", async (eventId: Event["id"]) => {
    try {
      return await findEventActivityActors(
        getApplicationContext(),
        await getRequestActor(),
        { eventId },
      );
    } catch (error) {
      return throwApplicationErrorForPage(error);
    }
  }),
);
