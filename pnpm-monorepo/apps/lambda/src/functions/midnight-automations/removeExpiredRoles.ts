import { prisma } from "@sam-monorepo/database";
import { log } from "../../common/logger";
import { captureAsyncFunc } from "../../common/xray";

export const removeExpiredRoles = async () => {
  await captureAsyncFunc("removeExpiredRoles", async () => {
    const citizenWithRoles = await captureAsyncFunc(
      "find citizens with roles",
      () =>
        prisma.entity.findMany({
          where: {
            roles: {
              not: null,
            },
            discordId: {
              not: null,
            },
          },
          select: {
            id: true,
            discordId: true,
            roles: true,
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
      const citizenRoles = citizenWithRole.roles?.split(",");
      if (!citizenRoles) continue;

      const account = accounts.find(
        (account) => account.providerAccountId === citizenWithRole.discordId,
      );

      for (const citizenRole of citizenRoles) {
        const roleExpirationDate = expirationMap.get(citizenRole);
        if (!roleExpirationDate) continue;

        if (
          !account?.user?.lastSeenAt ||
          account.user.lastSeenAt < roleExpirationDate
        ) {
          changes.push({
            citizenId: citizenWithRole.id,
            roleId: citizenRole,
          });
        }
      }
    }

    if (changes.length <= 0) {
      log.info("No expired roles found");
      return;
    }

    await captureAsyncFunc("remove expired roles", () =>
      prisma.$transaction(async (tx) => {
        await tx.entityLog.createManyAndReturn({
          data: changes.map((change) => ({
            type: "role-removed",
            content: change.roleId,
            entityId: change.citizenId,
          })),
          select: { id: true },
        });

        for (const change of changes) {
          const citizen = citizenWithRoles.find(
            (citizen) => citizen.id === change.citizenId,
          );
          if (!citizen?.roles) continue;

          const roles =
            citizen.roles
              .split(",")
              .filter((roleId) => roleId !== change.roleId)
              .join(",") || null;

          await tx.entity.update({
            where: { id: change.citizenId },
            data: {
              roles,
            },
          });
        }
      }),
    );

    log.info("Removed expired roles", { count: changes.length });
  });
};
