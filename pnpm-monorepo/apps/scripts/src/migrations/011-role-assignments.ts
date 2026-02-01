import type { Entity, EntityLog, Role } from "@sam-monorepo/database";
import { prisma } from "@sam-monorepo/database";

async function main() {
  const [roles, citizens, users, accounts, logs] = await prisma.$transaction([
    prisma.role.findMany({
      select: {
        id: true,
      },
    }),

    prisma.entity.findMany({
      select: {
        id: true,
        discordId: true,
      },
    }),

    prisma.user.findMany({
      select: {
        id: true,
      },
    }),

    prisma.account.findMany({
      select: {
        id: true,
        userId: true,
        providerAccountId: true,
      },
    }),

    prisma.entityLog.findMany({
      where: {
        type: {
          in: ["role-added", "role-removed"],
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    }),
  ]);

  // Map user IDs to citizen IDs
  const userIdToCitizenId = new Map<string, string>();
  for (const citizen of citizens) {
    if (!citizen.discordId) continue;

    const account = accounts.find(
      (acc) => acc.providerAccountId === citizen.discordId,
    );
    if (!account) continue;

    const user = users.find((user) => user.id === account.userId);
    if (!user) continue;

    userIdToCitizenId.set(user.id, citizen.id);
  }

  const validRoleIds = new Set(roles.map((role) => role.id));
  const validCitizenIds = new Set(citizens.map((citizen) => citizen.id));

  // Keep only the latest log per role assignment per citizen
  const aggregatedLogsPerCitizen = new Map<
    Entity["id"],
    Map<Role["id"], EntityLog>
  >();
  const logsWithMissingRole = new Map<Role["id"], number>();
  for (const log of logs) {
    if (!log.content) continue;
    if (!validRoleIds.has(log.content)) {
      logsWithMissingRole.set(
        log.content,
        (logsWithMissingRole.get(log.content) ?? 0) + 1,
      );
      continue;
    }

    if (!aggregatedLogsPerCitizen.has(log.entityId))
      aggregatedLogsPerCitizen.set(log.entityId, new Map());

    const citizen = aggregatedLogsPerCitizen.get(log.entityId);
    const role = citizen!.get(log.content);

    if (!role && log.type === "role-added") {
      citizen!.set(log.content, log);
    } else if (log.type === "role-added") {
      citizen!.set(log.content, log);
    } else if (log.type === "role-removed") {
      citizen!.delete(log.content);
    }
  }

  await prisma.$transaction([
    prisma.roleAssignment.deleteMany(),
    prisma.roleAssignmentChange.deleteMany(),

    prisma.roleAssignment.createMany({
      data: Array.from(aggregatedLogsPerCitizen.entries()).flatMap(
        ([citizenId, roles]) => {
          return Array.from(roles.entries()).map(([roleId, log]) => ({
            citizenId,
            roleId,
            createdAt: log.createdAt,
          }));
        },
      ),
    }),

    prisma.roleAssignmentChange.createMany({
      data: logs
        .filter((log) => Boolean(log.content) && validRoleIds.has(log.content!))
        .map((log) => {
          let createdById: string | null = null;
          const citizen = log.submittedById
            ? userIdToCitizenId.get(log.submittedById)
            : null;
          if (citizen && validCitizenIds.has(citizen)) createdById = citizen;

          return {
            citizenId: log.entityId,
            roleId: log.content!,
            type: log.type === "role-added" ? "ADD" : "REMOVE",
            createdAt: log.createdAt,
            createdById,
          };
        }),
    }),
  ]);

  if (logsWithMissingRole.size > 0) {
    console.info("Skipped logs because their roleId no longer exists:");
    for (const [roleId, count] of logsWithMissingRole) {
      console.info(`${roleId}: ${count} log(s)`);
    }
  }
}

void main().then(() => console.info("Finished."));
