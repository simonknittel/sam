import { getRequestActor } from "@/modules/application";
import {
  isAllowedToManageEvent as isActorAllowedToManageEvent,
  type EventManageInput,
} from "@sam-monorepo/application";

export const isAllowedToManageEvent = async (event: EventManageInput) =>
  isActorAllowedToManageEvent(await getRequestActor(), event);
