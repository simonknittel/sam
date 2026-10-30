import { getRequestActor } from "@/modules/application";
import {
  isLineupVisible as isLineupVisibleForActor,
  type EventManageInput,
} from "@sam-monorepo/application";
import type { Event } from "@sam-monorepo/database/client";

/** See `isLineupVisible()` of the application package */
export const isLineupVisible = async (
  event: EventManageInput &
    Pick<Event, "lineupEnabled" | "participationEnabled">,
) => isLineupVisibleForActor(await getRequestActor(), event);
