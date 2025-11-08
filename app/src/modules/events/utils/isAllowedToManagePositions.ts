import { requireAuthentication } from "@/modules/auth/server";
import type { Entity, Event } from "@prisma/client";

export const isAllowedToManagePositions = async (
  event: Pick<Event, "discordCreatorId"> & {
    managers: Pick<Entity, "discordId">[];
  },
) => {
  const authentication = await requireAuthentication();

  if (event.discordCreatorId === authentication.session.discordId) return true;

  if (
    event.managers.some(
      (manager) => manager.discordId === authentication.session.discordId,
    )
  )
    return true;

  if (await authentication.authorize("othersEventPosition", "manage"))
    return true;

  return false;
};
