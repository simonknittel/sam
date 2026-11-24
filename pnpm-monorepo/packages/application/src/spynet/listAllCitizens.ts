import { ACTIVE_CITIZEN_WHERE } from "@sam-monorepo/domain";
import { requirePermission, type Actor } from "../actor.js";
import {
  CITIZEN_REFERENCE_SELECT,
  type CitizenReferenceRow,
} from "../citizenReference.js";
import type { ApplicationContext } from "../context.js";

export type PickableCitizen = CitizenReferenceRow;

/**
 * The list has no limit and goes to the browser, thus it carries only what the
 * pickers need
 */
export const listAllCitizens = async (
  context: ApplicationContext,
  actor: Actor,
): Promise<PickableCitizen[]> => {
  requirePermission(actor, "citizen", "read");

  return context.prisma.citizen.findMany({
    where: ACTIVE_CITIZEN_WHERE,
    select: CITIZEN_REFERENCE_SELECT,
  });
};
