import { requireAuthentication } from "@/modules/auth/server";
import type { Entity, Event } from "@sam-monorepo/database/client";

export const isAllowedToManagePositions = async (
  event: Pick<Event, "discordCreatorId" | "createdById"> & {
    managers: Pick<Entity, "id">[];
  },
) => {
  const authentication = await requireAuthentication();

  /**
   * The Discord creator of a Discord event keeps manage rights even when no
   * citizen is attached to their Discord id yet.
   */
  if (
    event.discordCreatorId !== null &&
    event.discordCreatorId === authentication.session.discordId
  )
    return true;

  const citizenId = authentication.session.entity?.id ?? null;

  if (citizenId !== null && event.createdById === citizenId) return true;

  /**
   * Managers are matched by citizen id, not Discord id, so a manager
   * without a Discord id does not silently lose access.
   */
  if (
    citizenId !== null &&
    event.managers.some((manager) => manager.id === citizenId)
  )
    return true;

  if (await authentication.authorize("othersEventPosition", "manage"))
    return true;

  return false;
};
