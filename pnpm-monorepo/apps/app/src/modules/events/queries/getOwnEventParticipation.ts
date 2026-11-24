import {
  getApplicationContext,
  getRequestActor,
  throwApplicationErrorForPage,
} from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { findOwnEventParticipation } from "@sam-monorepo/application";
import type { Event } from "@sam-monorepo/database/client";
import { cache } from "react";

export const getOwnEventParticipation = cache(
  withTrace("getOwnEventParticipation", async (eventId: Event["id"]) => {
    try {
      return await findOwnEventParticipation(
        getApplicationContext(),
        await getRequestActor(),
        { eventId },
      );
    } catch (error) {
      return throwApplicationErrorForPage(error);
    }
  }),
);
