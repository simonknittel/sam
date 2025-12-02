import { prisma } from "@sam-monorepo/database";
import { log } from "../../common/logger";
import { captureAsyncFunc } from "../../common/xray";

export const countCitizensPerRole = async () => {
  await captureAsyncFunc("countCitizensPerRole", async () => {
    const [allRoles, roleCounts] = await Promise.all([
      captureAsyncFunc("get all roles", () =>
        prisma.role.findMany({
          select: {
            id: true,
          },
        }),
      ),
      captureAsyncFunc("count citizens per role", () =>
        prisma.roleAssignment.groupBy({
          by: ["roleId"],
          _count: {
            citizenId: true,
          },
        }),
      ),
    ]);

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

    log.info("Saved citizens per role statistics", { count: data.length });
  });
};
