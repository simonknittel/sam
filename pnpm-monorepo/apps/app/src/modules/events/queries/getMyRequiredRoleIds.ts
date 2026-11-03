import {
  getApplicationContext,
  getRequestActor,
  throwApplicationErrorForPage,
} from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { findOwnRequiredRoleIds } from "@sam-monorepo/application";
import type { Event } from "@sam-monorepo/database/client";
import { cache } from "react";

/**
 * The roles of the signed-in citizen that the requirement check of the lineup
 * needs
 */
export const getMyRequiredRoleIds = cache(
  withTrace("getMyRequiredRoleIds", async (eventId: Event["id"]) => {
    try {
      return await findOwnRequiredRoleIds(
        getApplicationContext(),
        await getRequestActor(),
        { eventId },
      );
    } catch (error) {
      return throwApplicationErrorForPage(error);
    }
  }),
);
