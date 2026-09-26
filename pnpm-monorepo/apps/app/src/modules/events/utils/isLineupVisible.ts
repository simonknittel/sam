import type { EventCitizenReference } from "@/modules/events/queries/eventRelationSelects";
import type { Event } from "@sam-monorepo/database/client";
import { isAllowedToManagePositions } from "./isAllowedToManagePositions";

export const isLineupVisible = async (
  event: Pick<Event, "lineupEnabled" | "discordCreatorId" | "createdById"> & {
    managers: EventCitizenReference[];
  },
) => {
  return event.lineupEnabled || (await isAllowedToManagePositions(event));
};
