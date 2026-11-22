import type { Actor } from "../actor.js";
import { ForbiddenError } from "../errors.js";

/**
 * Whether the actor can read the citizen: with `citizen;read`, or the own
 * citizen. Each citizen can read the own citizen without `citizen;read`,
 * because the dashboard shows the own profile to everyone.
 */
export const canReadCitizen = (
  actor: Pick<Actor, "citizen" | "authorize">,
  citizenId: string,
) => actor.citizen?.id === citizenId || actor.authorize("citizen", "read");

/** Throws a `ForbiddenError` when the actor cannot read the citizen */
export const requireCitizenReadAccess = (actor: Actor, citizenId: string) => {
  if (canReadCitizen(actor, citizenId)) return;

  throw new ForbiddenError("The permission citizen;read is missing");
};
