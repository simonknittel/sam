import { RoleAssignmentChangeType } from "@sam-monorepo/database/browser";
import {
  AuditEventType,
  ORGANIZATION_TIMEZONE,
  subtractCalendarDays,
} from "@sam-monorepo/domain";
import type { ApplicationContext } from "../context.js";
import { withSpan } from "../withSpan.js";
import { createRoleAssignmentChanges } from "./roleAssignmentWrites.js";

export interface RemoveExpiredRoleAssignmentsOutput {
  readonly removedCount: number;
}

interface RemovedAssignment {
  readonly citizenId: string;
  readonly citizenHandle: string | null;
  readonly roleId: string;
}

/**
 * An assignment expires when the assignment and the last visit are both older
 * than the maximum age. An assignment after the last visit counts as activity
 * too, otherwise the next run would remove a role assigned yesterday. Only
 * citizens with a login can be active, thus a citizen without one keeps the
 * role (the join with "User").
 */
export const removeExpiredRoleAssignments = (
  context: ApplicationContext,
): Promise<RemoveExpiredRoleAssignmentsOutput> =>
  withSpan(context, "removeExpiredRoleAssignments", async () => {
    const now = context.now();
    const rolesWithMaximumAge = await context.prisma.role.findMany({
      where: {
        maxAgeDays: {
          not: null,
        },
      },
      select: {
        id: true,
        name: true,
        maxAgeDays: true,
      },
    });
    if (rolesWithMaximumAge.length <= 0) return { removedCount: 0 };

    const roleNameById = new Map(
      rolesWithMaximumAge.map((role) => [role.id, role.name]),
    );
    const expiryDates = rolesWithMaximumAge.map((role) =>
      subtractCalendarDays(
        now,
        role.maxAgeDays!,
        ORGANIZATION_TIMEZONE,
      ).toISOString(),
    );

    const removedAssignments = await context.prisma.$transaction(
      async (transaction) => {
        /**
         * The filter is part of the delete, thus a visit after the start
         * of the run keeps the role. RETURNING gives only the rows that
         * this statement removed, not a row that a different transaction
         * removed first.
         */
        const removed = await transaction.$queryRaw<RemovedAssignment[]>`
          DELETE FROM "RoleAssignment" AS "assignment"
          USING
            unnest(
              ${rolesWithMaximumAge.map((role) => role.id)}::text[],
              ${expiryDates}::timestamptz[]
            ) AS "expiry"("roleId", "date"),
            "Citizen" AS "citizen",
            "User" AS "user"
          WHERE "assignment"."roleId" = "expiry"."roleId"
            AND "assignment"."createdAt" < "expiry"."date"
            AND "citizen"."id" = "assignment"."citizenId"
            AND "user"."id" = "citizen"."userId"
            AND ("user"."lastSeenAt" IS NULL OR "user"."lastSeenAt" < "expiry"."date")
          RETURNING
            "assignment"."citizenId",
            "citizen"."handle" AS "citizenHandle",
            "assignment"."roleId"
        `;

        await createRoleAssignmentChanges(
          transaction,
          removed.map(({ citizenId, roleId }) => ({
            citizenId,
            roleId,
            type: RoleAssignmentChangeType.REMOVE,
          })),
          null,
        );

        return removed;
      },
    );
    if (removedAssignments.length <= 0) return { removedCount: 0 };

    await context.audit.create(
      removedAssignments.map((assignment) => ({
        type: AuditEventType.ROLE_AUTO_REMOVED,
        data: {
          citizenId: assignment.citizenId,
          citizenHandle: assignment.citizenHandle,
          roleId: assignment.roleId,
          roleName: roleNameById.get(assignment.roleId)!,
        },
        createdById: null,
      })),
    );

    return { removedCount: removedAssignments.length };
  });
