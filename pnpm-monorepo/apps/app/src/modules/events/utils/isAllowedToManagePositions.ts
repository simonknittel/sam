import { getRequestActor } from "@/modules/application";
import {
  isAllowedToManagePositions as isActorAllowedToManagePositions,
  type EventManageInput,
} from "@sam-monorepo/application";

export const isAllowedToManagePositions = async (event: EventManageInput) =>
  isActorAllowedToManagePositions(await getRequestActor(), event);
