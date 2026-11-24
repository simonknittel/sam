import { getApplicationContext } from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import {
  findEventPositionTree,
  type EventDetails,
} from "@sam-monorepo/application";
import { cache } from "react";

/**
 * No permission check, see the README of the application package: the caller
 * resolves the event first.
 */
export const getEventPositions = cache(
  withTrace("getEventPositions", async (eventId: EventDetails["id"]) =>
    findEventPositionTree(getApplicationContext(), eventId),
  ),
);
