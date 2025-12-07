import { prisma, RoleAssignmentChangeType } from "@sam-monorepo/database";
import { log } from "../common/logger";
import { captureAsyncFunc } from "../common/xray";

export const removeExpiredRoles = async () => {
  await captureAsyncFunc("removeExpiredRoles", async () => {
    const citizenWithRoles = await captureAsyncFunc(
      "find citizens with roles",
      () =>
        prisma.entity.findMany({
          where: {
            roleAssignments: {
              some: {},
            },
            discordId: {
              not: null,
            },
          },
          select: {
            id: true,
            discordId: true,
            roleAssignments: {
              select: {
                roleId: true,
              },
            },
          },
        }),
    );

    if (citizenWithRoles.length <= 0) {
      log.info("No citizens with roles found");
      return;
    }

    const accounts = await captureAsyncFunc("find accounts for citizens", () =>
      prisma.account.findMany({
        where: {
          provider: "discord",
          providerAccountId: {
            in: citizenWithRoles.map((citizen) => citizen.discordId!),
          },
        },
        select: {
          id: true,
          providerAccountId: true,
          user: {
            select: {
              lastSeenAt: true,
            },
          },
        },
      }),
    );

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
            maxAgeDays: true,
          },
        }),
    );

    const expirationMap = new Map<string, Date>();
    for (const role of rolesWithMaxAge) {
      const date = new Date();
      date.setDate(date.getDate() - role.maxAgeDays!);
      expirationMap.set(role.id, date);
    }

    const changes: { citizenId: string; roleId: string }[] = [];
    for (const citizenWithRole of citizenWithRoles) {
      if (citizenWithRole.roleAssignments.length <= 0) continue;

      const account = accounts.find(
        (account) => account.providerAccountId === citizenWithRole.discordId,
      );

      for (const roleAssignment of citizenWithRole.roleAssignments) {
        const roleExpirationDate = expirationMap.get(roleAssignment.roleId);
        if (!roleExpirationDate) continue;

        if (
          !account?.user?.lastSeenAt ||
          account.user.lastSeenAt < roleExpirationDate
        ) {
          changes.push({
            citizenId: citizenWithRole.id,
            roleId: roleAssignment.roleId,
          });
        }
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

        ...changes.map((change) =>
          prisma.roleAssignment.delete({
            where: {
              citizenId_roleId: {
                citizenId: change.citizenId,
                roleId: change.roleId,
              },
            },
          }),
        ),
      ]),
    );

    log.info("Removed expired roles", { count: changes.length });
  });
};
