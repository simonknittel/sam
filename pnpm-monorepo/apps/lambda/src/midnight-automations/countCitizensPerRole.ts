import { prisma } from "@sam-monorepo/database";
import {
  ACTIVE_CITIZEN_WHERE,
  AuditEventType,
  getYesterdayDateColumnValue,
} from "@sam-monorepo/domain";
import { createAuditEvents } from "../common/audit";
import { log } from "../common/logger";
import { captureAsyncFunc } from "../common/xray";

export const countCitizensPerRole = async () => {
  await captureAsyncFunc("countCitizensPerRole", async () => {
    const countedDay = getYesterdayDateColumnValue(new Date());

    const [allRoles, roleCounts] = await captureAsyncFunc(
      "fetch roles and counts",
      () =>
        prisma.$transaction(async (transaction) => {
          const roles = await transaction.role.findMany({
            select: {
              id: true,
            },
          });
          const counts = await transaction.roleAssignment.groupBy({
            by: ["roleId"],
            where: { citizen: ACTIVE_CITIZEN_WHERE },
            _count: {
              citizenId: true,
            },
          });
          return [roles, counts] as const;
        }),
    );

    const roleCountMap = new Map(
      roleCounts.map((roleCount) => [
        roleCount.roleId,
        roleCount._count.citizenId,
      ]),
    );

    const data = allRoles.map((role) => ({
      roleId: role.id,
      day: countedDay,
      count: roleCountMap.get(role.id) ?? 0,
    }));

    /**
     * A run that repeats in the same night (for example after an error in a
     * later job) keeps the counts of the first run, see
     * `RoleCitizenCount_roleId_day_key`. The first run is the nearest to the
     * end of the counted day.
     */
    const created = await captureAsyncFunc("save role citizen counts", () =>
      prisma.roleCitizenCount.createMany({
        data,
        skipDuplicates: true,
      }),
    );

    await createAuditEvents([
      {
        type: AuditEventType.CITIZENS_PER_ROLE_COUNTED,
        data: { roleCount: data.length },
      },
    ]);

    log.info("Saved citizens per role statistics", { count: created.count });
  });
};
