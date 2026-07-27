import { requireAuthentication } from "@/modules/auth/server";
import type { Entity, Event } from "@sam-monorepo/database/client";

export const isAllowedToManageEvent = async (
  event: Pick<Event, "discordCreatorId"> & {
    managers: Entity[];
  },
) => {
  const authentication = await requireAuthentication();

  if (event.discordCreatorId === authentication.session.discordId) return true;

  if (
    event.managers.some(
      (organizer) => organizer.discordId === authentication.session.discordId,
    )
  )
    return true;

  if (await authentication.authorize("event", "manage")) return true;

  return false;
};
