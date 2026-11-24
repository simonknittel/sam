import {
  ACTIVE_CITIZEN_WHERE,
  AuditEventType,
  getYesterdayDateColumnValue,
} from "@sam-monorepo/domain";
import type { ApplicationContext } from "../context.js";
import { withSpan } from "../withSpan.js";

export interface CountCitizensPerRoleOutput {
  readonly roleCount: number;
  /** Zero for a repeated run */
  readonly savedCount: number;
}

/**
 * Counts the day that just ended: the day before the run in the time zone of
 * the organization
 */
export const countCitizensPerRole = (
  context: ApplicationContext,
): Promise<CountCitizensPerRoleOutput> =>
  withSpan(context, "countCitizensPerRole", async () => {
    const now = context.now();
    const countedDay = getYesterdayDateColumnValue(now);

    const [roles, roleCounts] = await context.prisma.$transaction(
      async (transaction) => {
        const allRoles = await transaction.role.findMany({
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
        return [allRoles, counts] as const;
      },
    );

    const citizenCountByRoleId = new Map(
      roleCounts.map((roleCount) => [
        roleCount.roleId,
        roleCount._count.citizenId,
      ]),
    );

    const data = roles.map((role) => ({
      roleId: role.id,
      day: countedDay,
      count: citizenCountByRoleId.get(role.id) ?? 0,
    }));

    const created = await context.prisma.roleCitizenCount.createMany({
      data,
      skipDuplicates: true,
    });

    await context.audit.create([
      {
        type: AuditEventType.CITIZENS_PER_ROLE_COUNTED,
        data: { roleCount: data.length },
        createdById: null,
      },
    ]);

    return { roleCount: data.length, savedCount: created.count };
  });
