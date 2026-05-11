import { prisma, RoleAssignmentChangeType } from "@sam-monorepo/database";
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

    const citizensWithDiscord = await captureAsyncFunc(
      "find citizens with discord accounts",
      () =>
        prisma.entity.findMany({
          where: {
            discordId: {
              not: null,
            },
          },
          select: {
            id: true,
            handle: true,
            discordId: true,
            roleAssignments: {
              select: {
                roleId: true,
              },
            },
          },
        }),
    );

    if (citizensWithDiscord.length <= 0) {
      log.info("No citizens with Discord accounts found");
      return;
    }

    const accounts = await captureAsyncFunc("find accounts for citizens", () =>
      prisma.account.findMany({
        where: {
          provider: "discord",
          providerAccountId: {
            in: citizensWithDiscord.map((citizen) => citizen.discordId!),
          },
        },
        select: {
          providerAccountId: true,
          user: {
            select: {
              lastSeenAt: true,
            },
          },
        },
      }),
    );

    const assignmentsToCreate: {
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

      for (const citizen of citizensWithDiscord) {
        const alreadyHasRole = citizen.roleAssignments.some(
          (assignment) => assignment.roleId === role.id,
        );
        if (alreadyHasRole) continue;

        const account = accounts.find(
          (account) => account.providerAccountId === citizen.discordId,
        );
        if (!account?.user.lastSeenAt) continue;

        const isInactive = account.user.lastSeenAt < inactiveThreshold;

        if (isInactive) {
          assignmentsToCreate.push({
            citizenId: citizen.id,
            citizenHandle: citizen.handle,
            roleId: role.id,
            roleName: role.name,
          });
        }
      }
    }

    if (assignmentsToCreate.length <= 0) {
      log.info("No citizens eligible for auto-assign");
      return;
    }

    await captureAsyncFunc("create role assignments", () =>
      prisma.$transaction([
        prisma.roleAssignmentChange.createMany({
          data: assignmentsToCreate.map((assignment) => ({
            type: RoleAssignmentChangeType.ADD,
            roleId: assignment.roleId,
            citizenId: assignment.citizenId,
          })),
        }),

        prisma.roleAssignment.createMany({
          data: assignmentsToCreate.map((assignment) => ({
            citizenId: assignment.citizenId,
            roleId: assignment.roleId,
          })),
          skipDuplicates: true,
        }),
      ]),
    );

    await captureAsyncFunc("create audit events", () =>
      prisma.auditEvent.createMany({
        data: assignmentsToCreate.map((assignment) => ({
          type: "ROLE_AUTO_ASSIGNED",
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
