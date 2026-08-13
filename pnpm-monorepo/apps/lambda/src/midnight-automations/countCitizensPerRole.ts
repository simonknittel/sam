import { prisma } from "@sam-monorepo/database";
import { AuditEventType } from "@sam-monorepo/domain";
import { createAuditEvents } from "../common/audit";
import { log } from "../common/logger";
import { captureAsyncFunc } from "../common/xray";

export const countCitizensPerRole = async () => {
  await captureAsyncFunc("countCitizensPerRole", async () => {
    const [allRoles, roleCounts] = await captureAsyncFunc(
      "fetch roles and counts",
      () =>
        prisma.$transaction(async (tx) => {
          const roles = await tx.role.findMany({
            select: {
              id: true,
            },
          });
          const counts = await tx.roleAssignment.groupBy({
            by: ["roleId"],
            _count: {
              citizenId: true,
            },
          });
          return [roles, counts] as const;
        }),
    );

    const roleCountMap = new Map(
      roleCounts.map((rc) => [rc.roleId, rc._count.citizenId]),
    );

    const data = allRoles.map((role) => ({
      roleId: role.id,
      count: roleCountMap.get(role.id) ?? 0,
    }));

    await captureAsyncFunc("save role citizen counts", () =>
      prisma.roleCitizenCount.createMany({
        data,
      }),
    );

    await createAuditEvents([
      {
        type: AuditEventType.CITIZENS_PER_ROLE_COUNTED,
        data: { roleCount: data.length },
      },
    ]);

    log.info("Saved citizens per role statistics", { count: data.length });
  });
};
