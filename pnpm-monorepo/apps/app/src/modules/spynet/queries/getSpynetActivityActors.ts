import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { Entity } from "@sam-monorepo/database/client";
import { cache } from "react";

type Actor = Pick<Entity, "id" | "handle">;

const ACTOR_SELECT = {
  createdBy: {
    select: {
      id: true,
      handle: true,
    },
  },
} as const;

/**
 * Everyone who caused at least one entry the reader may see, for the actor
 * filter. Sources the reader has no access to contribute nobody, so the
 * filter never advertises names the table could not show entries for.
 */
export const getSpynetActivityActors = cache(
  withTrace("getSpynetActivityActors", async () => {
    const authentication = await requireAuthentication();

    const [canReadOrganizations, canReadRoles] = await Promise.all([
      authentication.authorize("organization", "read"),
      authentication.authorize("otherRole", "read"),
    ]);

    const rows = await Promise.all([
      canReadOrganizations
        ? prisma.organization.findMany({
            distinct: ["createdById"],
            select: ACTOR_SELECT,
          })
        : [],

      canReadOrganizations
        ? prisma.organizationAttributeHistoryEntry.findMany({
            distinct: ["createdById"],
            select: ACTOR_SELECT,
          })
        : [],

      canReadOrganizations
        ? prisma.organizationMembershipHistoryEntry.findMany({
            distinct: ["createdById"],
            select: ACTOR_SELECT,
          })
        : [],

      canReadRoles
        ? prisma.roleAssignmentChange.findMany({
            where: {
              createdById: {
                not: null,
              },
            },
            distinct: ["createdById"],
            select: ACTOR_SELECT,
          })
        : [],

      canReadRoles
        ? prisma.roleAssignmentLevelChange.findMany({
            where: {
              createdById: {
                not: null,
              },
            },
            distinct: ["createdById"],
            select: ACTOR_SELECT,
          })
        : [],
    ]);

    const actorsById = new Map<string, Actor>();
    for (const row of rows.flat()) {
      if (row.createdBy) actorsById.set(row.createdBy.id, row.createdBy);
    }

    return Array.from(actorsById.values()).toSorted((a, b) =>
      (a.handle || a.id).localeCompare(b.handle || b.id),
    );
  }),
);
