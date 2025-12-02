import { prisma } from "@sam-monorepo/database";
import { log } from "../../common/logger";
import { captureAsyncFunc } from "../../common/xray";

export const countCitizensPerRole = async () => {
  await captureAsyncFunc("countCitizensPerRole", async () => {
    const roleCounts = await captureAsyncFunc("count citizens per role", () =>
      prisma.roleAssignment.groupBy({
        by: ["roleId"],
        _count: {
          citizenId: true,
        },
      }),
    );

    if (roleCounts.length <= 0) {
      log.info("No role assignments found");
      return;
    }

    await captureAsyncFunc("save role citizen counts", () =>
      prisma.roleCitizenCount.createMany({
        data: roleCounts.map((roleCount) => ({
          roleId: roleCount.roleId,
          count: roleCount._count.citizenId,
        })),
      }),
    );

    log.info("Saved citizens per role statistics", { count: roleCounts.length });
  });
};
