import { getRequestActor } from "@/modules/application";
import {
  mustApplyForEvent as mustActorApplyForEvent,
  type EventApplicationRequirementInput,
} from "@sam-monorepo/application";

export const mustApplyForEvent = async (
  event: EventApplicationRequirementInput,
) => mustActorApplyForEvent(await getRequestActor(), event);
