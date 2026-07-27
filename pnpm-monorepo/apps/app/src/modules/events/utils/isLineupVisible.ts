import type { Entity, Event } from "@sam-monorepo/database/client";
import { isAllowedToManagePositions } from "./isAllowedToManagePositions";

export const isLineupVisible = async (
  event: Event & {
    managers: Entity[];
  },
) => {
  return event.lineupEnabled || (await isAllowedToManagePositions(event));
};
