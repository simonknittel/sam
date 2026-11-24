import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { buildActivePenaltyEntryWhere } from "../penaltyPoints/activePenaltyEntryWhere.js";

const isOwnCitizen = (actor: Actor, citizenId: string) =>
  actor.citizen?.id === citizenId;

export const getVisiblePenaltyPointSum = async (
  context: Pick<ApplicationContext, "prisma" | "now">,
  actor: Actor,
  citizenId: string,
): Promise<number | null> => {
  if (
    !actor.authorize(
      isOwnCitizen(actor, citizenId) ? "ownPenaltyEntry" : "penaltyEntry",
      "read",
    )
  )
    return null;

  const aggregation = await context.prisma.penaltyEntry.aggregate({
    where: { citizenId, ...buildActivePenaltyEntryWhere(context.now()) },
    _sum: { points: true },
  });

  return aggregation._sum.points ?? 0;
};

export const getVisibleShipCount = async (
  context: Pick<ApplicationContext, "prisma">,
  actor: Actor,
  citizenId: string,
): Promise<number | null> => {
  if (
    !actor.authorize(
      isOwnCitizen(actor, citizenId) ? "ship" : "otherShips",
      "read",
    )
  )
    return null;

  return context.prisma.ship.count({
    where: { ownerId: citizenId, deletedAt: null },
  });
};
