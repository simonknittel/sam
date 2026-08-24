import type { EventCitizenReference } from "@/modules/events/queries/eventRelationSelects";
import type { Event } from "@sam-monorepo/database/client";
import { isAllowedToManagePositions } from "./isAllowedToManagePositions";

export const isLineupVisible = async (
  event: Event & {
    managers: EventCitizenReference[];
  },
) => {
  return event.lineupEnabled || (await isAllowedToManagePositions(event));
};
