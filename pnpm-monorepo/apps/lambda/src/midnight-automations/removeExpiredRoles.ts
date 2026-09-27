import { prisma, RoleAssignmentChangeType } from "@sam-monorepo/database";
import { AuditEventType } from "@sam-monorepo/domain";
import { log } from "../common/logger";
import { captureAsyncFunc } from "../common/xray";

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

    /**
     * Only citizens with a login can be active, thus a citizen without one
     * keeps the role.
     */
    const assignments = await captureAsyncFunc(
      "find assignments of citizens with a login",
      () =>
        prisma.roleAssignment.findMany({
          where: {
            roleId: {
              in: rolesWithMaxAge.map((role) => role.id),
            },
            citizen: {
              userId: {
                not: null,
              },
            },
          },
          select: {
            roleId: true,
            createdAt: true,
            citizen: {
              select: {
                id: true,
                handle: true,
                user: {
                  select: {
                    lastSeenAt: true,
                  },
                },
              },
            },
          },
        }),
    );

    const expirationMap = new Map<string, Date>();
    const roleNameMap = new Map<string, string>();
    for (const role of rolesWithMaxAge) {
      const date = new Date();
      date.setDate(date.getDate() - role.maxAgeDays!);
      expirationMap.set(role.id, date);
      roleNameMap.set(role.id, role.name);
    }

    const changes: {
      citizenId: string;
      citizenHandle: string | null;
      roleId: string;
      roleName: string;
    }[] = [];
    for (const assignment of assignments) {
      const roleExpirationDate = expirationMap.get(assignment.roleId)!;

      /**
       * A role assigned after the last visit counts as activity too,
       * otherwise the next run would remove a role assigned yesterday.
       */
      const lastSeenAt = assignment.citizen.user?.lastSeenAt;
      const lastActivityAt =
        lastSeenAt && lastSeenAt > assignment.createdAt
          ? lastSeenAt
          : assignment.createdAt;

      if (lastActivityAt < roleExpirationDate) {
        changes.push({
          citizenId: assignment.citizen.id,
          citizenHandle: assignment.citizen.handle,
          roleId: assignment.roleId,
          roleName: roleNameMap.get(assignment.roleId)!,
        });
      }
    }

    if (changes.length <= 0) {
      log.info("No expired roles found");
      return;
    }

    await captureAsyncFunc("remove expired roles", () =>
      prisma.$transaction([
        prisma.roleAssignmentChange.createMany({
          data: changes.map((change) => ({
            type: RoleAssignmentChangeType.REMOVE,
            roleId: change.roleId,
            citizenId: change.citizenId,
          })),
        }),

        prisma.roleAssignment.deleteMany({
          where: {
            OR: changes.map(({ citizenId, roleId }) => ({ citizenId, roleId })),
          },
        }),
      ]),
    );

    await captureAsyncFunc("create audit events", () =>
      prisma.auditEvent.createMany({
        data: changes.map((change) => ({
          type: AuditEventType.ROLE_AUTO_REMOVED,
          data: JSON.stringify({
            citizenId: change.citizenId,
            citizenHandle: change.citizenHandle,
            roleId: change.roleId,
            roleName: change.roleName,
          }),
        })),
      }),
    );

    log.info("Removed expired roles", { count: changes.length });
  });
};
