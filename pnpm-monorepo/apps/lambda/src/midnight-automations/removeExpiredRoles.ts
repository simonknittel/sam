import { prisma, RoleAssignmentChangeType } from "@sam-monorepo/database";
import { AuditEventType } from "@sam-monorepo/domain";
import { log } from "../common/logger";
import { captureAsyncFunc } from "../common/xray";

interface RemovedAssignment {
  readonly citizenId: string;
  readonly citizenHandle: string | null;
  readonly roleId: string;
}

export const removeExpiredRoles = async () => {
  await captureAsyncFunc("removeExpiredRoles", async () => {
    const rolesWithMaxAge = await captureAsyncFunc(
      "find roles with max age",
      () =>
        prisma.role.findMany({
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
        }),
    );

    if (rolesWithMaxAge.length <= 0) {
      log.info("No roles with max age found");
      return;
    }

    const roleNameMap = new Map(
      rolesWithMaxAge.map((role) => [role.id, role.name]),
    );
    const expiryDates = rolesWithMaxAge.map((role) => {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() - role.maxAgeDays!);
      return expiryDate.toISOString();
    });

    const removedAssignments = await captureAsyncFunc(
      "remove expired roles",
      () =>
        prisma.$transaction(async (transaction) => {
          /**
           * A role expires when the assignment and the last visit are both
           * older than the maximum age of the role. A role assigned after
           * the last visit counts as activity too, otherwise the next run
           * would remove a role assigned yesterday. Only citizens with a
           * login can be active, thus a citizen without one keeps the role
           * (the join with "User").
           *
           * The filter is part of the delete, thus a visit after the start
           * of the job keeps the role. RETURNING gives only the rows that
           * this statement removed, not a row that a different transaction
           * removed first.
           */
          const removed = await transaction.$queryRaw<RemovedAssignment[]>`
            DELETE FROM "RoleAssignment" AS "assignment"
            USING
              unnest(
                ${rolesWithMaxAge.map((role) => role.id)}::text[],
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

          await transaction.roleAssignmentChange.createMany({
            data: removed.map((assignment) => ({
              type: RoleAssignmentChangeType.REMOVE,
              roleId: assignment.roleId,
              citizenId: assignment.citizenId,
            })),
          });

          return removed;
        }),
    );

    if (removedAssignments.length <= 0) {
      log.info("No expired roles found");
      return;
    }

    await captureAsyncFunc("create audit events", () =>
      prisma.auditEvent.createMany({
        data: removedAssignments.map((assignment) => ({
          type: AuditEventType.ROLE_AUTO_REMOVED,
          data: {
            citizenId: assignment.citizenId,
            citizenHandle: assignment.citizenHandle,
            roleId: assignment.roleId,
            roleName: roleNameMap.get(assignment.roleId)!,
          },
        })),
      }),
    );

    log.info("Removed expired roles", { count: removedAssignments.length });
  });
};
