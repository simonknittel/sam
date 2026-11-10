import { getRequestActor } from "@/modules/application";
import {
  isLineupVisible as isLineupVisibleForActor,
  type EventDetails,
  type EventManageInput,
} from "@sam-monorepo/application";

/** See `isLineupVisible()` of the application package */
export const isLineupVisible = async (
  event: EventManageInput &
    Pick<EventDetails, "lineupEnabled" | "participationEnabled">,
) => isLineupVisibleForActor(await getRequestActor(), event);
