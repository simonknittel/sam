import { requirePermission, type Actor } from "../actor.js";
import {
  CITIZEN_REFERENCE_SELECT,
  type CitizenReferenceRow,
} from "../citizenReference.js";
import type { ApplicationContext } from "../context.js";
import { withSpan } from "../withSpan.js";

const ACTOR_SELECT = {
  createdBy: { select: CITIZEN_REFERENCE_SELECT },
} as const;

export type SpynetActivityActor = CitizenReferenceRow;

/**
 * A source that the actor cannot read gives no citizen, thus the filter never
 * shows a name without entries in the table
 */
export const findSpynetActivityActors = (
  context: Pick<ApplicationContext, "prisma" | "tracer">,
  actor: Actor,
): Promise<SpynetActivityActor[]> =>
  withSpan(context, "findSpynetActivityActors", async () => {
    requirePermission(actor, "spynetActivity", "read");

    const canReadOrganizations = actor.authorize("organization", "read");
    const canReadRoles = actor.authorize("otherRole", "read");

    const rows = await Promise.all([
      canReadOrganizations
        ? context.prisma.organization.findMany({
            distinct: ["createdById"],
            select: ACTOR_SELECT,
          })
        : [],

      canReadOrganizations
        ? context.prisma.organizationAttributeHistoryEntry.findMany({
            distinct: ["createdById"],
            select: ACTOR_SELECT,
          })
        : [],

      canReadOrganizations
        ? context.prisma.organizationMembershipHistoryEntry.findMany({
            distinct: ["createdById"],
            select: ACTOR_SELECT,
          })
        : [],

      canReadRoles
        ? context.prisma.roleAssignmentChange.findMany({
            where: { createdById: { not: null } },
            distinct: ["createdById"],
            select: ACTOR_SELECT,
          })
        : [],

      canReadRoles
        ? context.prisma.roleAssignmentLevelChange.findMany({
            where: { createdById: { not: null } },
            distinct: ["createdById"],
            select: ACTOR_SELECT,
          })
        : [],
    ]);

    const actorsById = new Map<string, SpynetActivityActor>();
    for (const row of rows.flat()) {
      if (row.createdBy) actorsById.set(row.createdBy.id, row.createdBy);
    }

    return Array.from(actorsById.values()).toSorted((first, second) =>
      (first.handle || first.id).localeCompare(second.handle || second.id),
    );
  });
