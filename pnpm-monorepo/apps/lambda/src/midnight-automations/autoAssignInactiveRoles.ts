import { prisma, RoleAssignmentChangeType } from "@sam-monorepo/database";
import { AuditEventType } from "@sam-monorepo/domain";
import { log } from "../common/logger";
import { captureAsyncFunc } from "../common/xray";

export const autoAssignInactiveRoles = async () => {
  await captureAsyncFunc("autoAssignInactiveRoles", async () => {
    const rolesWithAutoAssign = await captureAsyncFunc(
      "find roles with auto-assign",
      () =>
        prisma.role.findMany({
          where: {
            assignAfterInactiveDays: {
              not: null,
            },
          },
          select: {
            id: true,
            name: true,
            assignAfterInactiveDays: true,
          },
        }),
    );

    if (rolesWithAutoAssign.length <= 0) {
      log.info("No roles with auto-assign configured");
      return;
    }

    const candidates: {
      citizenId: string;
      citizenHandle: string | null;
      roleId: string;
      roleName: string;
    }[] = [];

    for (const role of rolesWithAutoAssign) {
      const inactiveThreshold = new Date();
      inactiveThreshold.setDate(
        inactiveThreshold.getDate() - role.assignAfterInactiveDays!,
      );

      /** A citizen without a login or without a known visit is skipped */
      const inactiveCitizens = await captureAsyncFunc(
        "find inactive citizens without the role",
        () =>
          prisma.citizen.findMany({
            where: {
              user: {
                lastSeenAt: {
                  lt: inactiveThreshold,
                },
              },
              roleAssignments: {
                none: {
                  roleId: role.id,
                },
              },
            },
            select: {
              id: true,
              handle: true,
            },
          }),
      );

      for (const citizen of inactiveCitizens) {
        candidates.push({
          citizenId: citizen.id,
          citizenHandle: citizen.handle,
          roleId: role.id,
          roleName: role.name,
        });
      }
    }

    if (candidates.length <= 0) {
      log.info("No citizens eligible for auto-assign");
      return;
    }

    /**
     * A manual assignment at the same time wins: the history gets rows only
     * for the assignments that this run created.
     */
    const createdAssignments = await captureAsyncFunc(
      "create role assignments",
      () =>
        prisma.$transaction(async (transaction) => {
          const created = await transaction.roleAssignment.createManyAndReturn({
            data: candidates.map(({ citizenId, roleId }) => ({
              citizenId,
              roleId,
            })),
            skipDuplicates: true,
            select: {
              citizenId: true,
              roleId: true,
            },
          });

          await transaction.roleAssignmentChange.createMany({
            data: created.map(({ citizenId, roleId }) => ({
              type: RoleAssignmentChangeType.ADD,
              citizenId,
              roleId,
            })),
          });

          return created;
        }),
    );

    const assignmentsToCreate = candidates.filter((candidate) =>
      createdAssignments.some(
        (created) =>
          created.citizenId === candidate.citizenId &&
          created.roleId === candidate.roleId,
      ),
    );

    if (assignmentsToCreate.length <= 0) {
      log.info("No citizens eligible for auto-assign");
      return;
    }

    await captureAsyncFunc("create audit events", () =>
      prisma.auditEvent.createMany({
        data: assignmentsToCreate.map((assignment) => ({
          type: AuditEventType.ROLE_AUTO_ASSIGNED,
          data: JSON.stringify({
            citizenId: assignment.citizenId,
            citizenHandle: assignment.citizenHandle,
            roleId: assignment.roleId,
            roleName: assignment.roleName,
          }),
        })),
      }),
    );

    log.info("Auto-assigned roles to inactive citizens", {
      count: assignmentsToCreate.length,
    });
  });
};
