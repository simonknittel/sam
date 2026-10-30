import {
  AuditEventType,
  getLocalDate,
  isSalaryDue,
  lockSilcLedger,
  ORGANIZATION_TIMEZONE,
  toDateColumnValue,
  updateSilcBalances,
} from "@sam-monorepo/domain";
import type { ApplicationContext } from "../context.js";
import { withSpan } from "../withSpan.js";
import { ROLE_SALARY_SELECT } from "./roleSalaryRows.js";
import { getPaidAssignments, SALARY_ROLE_SELECT } from "./salaryRules.js";
import { announceSilcTransactions } from "./silcLedger.js";

export interface DisburseRoleSalariesOutput {
  /** The roles with a salary on the day of the run */
  readonly dueRoleCount: number;
  /** The new bookings. A repeated run on the same day books nothing. */
  readonly transactionCount: number;
  readonly disbursedValue: number;
  readonly notificationsSent: boolean;
}

/**
 * Pays the salaries of the roles that are due on the day of the run (in the
 * time zone of the organization) to the citizens who get them (see
 * `getPaidAssignments()`), and notifies the receivers.
 */
export const disburseRoleSalaries = (
  context: ApplicationContext,
): Promise<DisburseRoleSalariesOutput> =>
  withSpan(context, "disburseRoleSalaries", async () => {
    const today = getLocalDate(context.now(), ORGANIZATION_TIMEZONE);
    const salaries = await context.prisma.silcRoleSalary.findMany({
      select: ROLE_SALARY_SELECT,
    });

    /**
     * One booking for each role and citizen and day: the unique index on
     * the source columns allows no second one. On the last day of a short
     * month, a role can have more than one due salary (for example on the
     * 30th and the 31st), thus the due salaries of one role are added up.
     */
    const todaysValueByRoleId = new Map<string, number>();
    for (const salary of salaries) {
      if (!isSalaryDue(salary.dayOfMonth, today)) continue;

      todaysValueByRoleId.set(
        salary.roleId,
        (todaysValueByRoleId.get(salary.roleId) ?? 0) + salary.value,
      );
    }

    if (todaysValueByRoleId.size <= 0)
      return {
        dueRoleCount: 0,
        transactionCount: 0,
        disbursedValue: 0,
        notificationsSent: true,
      };

    const roles = await context.prisma.role.findMany({
      where: { id: { in: [...todaysValueByRoleId.keys()] } },
      select: SALARY_ROLE_SELECT,
    });

    const salaryDate = toDateColumnValue(today);
    const bookings = roles.flatMap((role) => {
      const value = todaysValueByRoleId.get(role.id);
      if (value === undefined) return [];

      return getPaidAssignments(role).map((assignment) => ({
        receiverId: assignment.citizenId,
        value,
        description: `Gehalt: ${role.name}`,
        salaryRoleId: role.id,
        salaryDate,
      }));
    });

    const createdTransactions = await context.prisma.$transaction(
      async (transaction) => {
        await lockSilcLedger(transaction);

        /**
         * A run that repeats (for example after an error in a later job)
         * skips the bookings that exist already, see
         * `SilcTransaction_salary_key`.
         */
        const created = await transaction.silcTransaction.createManyAndReturn({
          data: bookings,
          skipDuplicates: true,
          select: {
            id: true,
            receiverId: true,
            value: true,
            salaryRoleId: true,
          },
        });

        await updateSilcBalances(
          transaction,
          created.map((booking) => booking.receiverId),
        );

        return created;
      },
    );

    const disbursedValue = createdTransactions.reduce(
      (total, booking) => total + booking.value,
      0,
    );

    if (createdTransactions.length > 0)
      await context.audit.create([
        {
          type: AuditEventType.ROLE_SALARIES_DISBURSED,
          data: {
            roleIds: [
              ...new Set(
                createdTransactions.flatMap((booking) =>
                  booking.salaryRoleId ? [booking.salaryRoleId] : [],
                ),
              ),
            ],
            transactionCount: createdTransactions.length,
            disbursedValue,
          },
          createdById: null,
        },
      ]);

    return {
      dueRoleCount: todaysValueByRoleId.size,
      transactionCount: createdTransactions.length,
      disbursedValue,
      notificationsSent: await announceSilcTransactions(
        context,
        createdTransactions.map((booking) => booking.id),
      ),
    };
  });
