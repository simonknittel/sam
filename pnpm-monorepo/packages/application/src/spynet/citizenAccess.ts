import type { Actor } from "../actor.js";
import { ForbiddenError } from "../errors.js";

/**
 * Each citizen can read the own citizen without `citizen;read`, because the
 * dashboard shows the own profile to everyone
 */
export const canReadCitizen = (
  actor: Pick<Actor, "citizen" | "authorize">,
  citizenId: string,
) => actor.citizen?.id === citizenId || actor.authorize("citizen", "read");

export const requireCitizenReadAccess = (actor: Actor, citizenId: string) => {
  if (canReadCitizen(actor, citizenId)) return;

  throw new ForbiddenError("The permission citizen;read is missing");
};
