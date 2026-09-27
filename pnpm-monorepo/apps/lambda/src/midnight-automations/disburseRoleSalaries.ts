import { createId } from "@paralleldrive/cuid2";
import { prisma } from "@sam-monorepo/database";
import {
  ACTIVE_CITIZEN_WHERE,
  AuditEventType,
  getLocalDate,
  lockSilcLedger,
  ORGANIZATION_TIMEZONE,
  toDateColumnValue,
  updateSilcBalances,
  type LocalDate,
} from "@sam-monorepo/domain";
import { hasReachedMaxLevel } from "@sam-monorepo/permissions";
import { createAuditEvents } from "../common/audit";
import { emitEvents } from "../common/eventbridge";
import { log } from "../common/logger";
import { captureAsyncFunc } from "../common/xray";
import { getRoleSalaries } from "./getRoleSalaries";

const getLastDayOfMonth = ({ year, month }: LocalDate) =>
  toDateColumnValue({ year, month: month + 1, day: 0 }).getUTCDate();

/**
 * A salary is due on its day of the month. A short month does not have the
 * day of each salary (for example the 31st), thus such a salary is due on
 * the last day of the month.
 */
const isSalaryDue = (dayOfMonth: number, today: LocalDate) =>
  dayOfMonth === today.day ||
  (today.day === getLastDayOfMonth(today) && dayOfMonth > today.day);

export const disburseRoleSalaries = async () => {
  await captureAsyncFunc("disburseRoleSalaries", async () => {
    const today = getLocalDate(new Date(), ORGANIZATION_TIMEZONE);
    const salaries = await getRoleSalaries();

    /**
     * One booking for each role and citizen and day: the unique index on the
     * source columns allows no second one. On the last day of a short month,
     * a role can have more than one due salary (for example on the 30th and
     * the 31st), thus the due salaries of one role are added up.
     */
    const todaysValueByRoleId = new Map<string, number>();
    for (const salary of salaries) {
      if (!isSalaryDue(salary.dayOfMonth, today)) continue;

      todaysValueByRoleId.set(
        salary.roleId,
        (todaysValueByRoleId.get(salary.roleId) ?? 0) + salary.value,
      );
    }

    if (todaysValueByRoleId.size <= 0) {
      log.info("No salaries are due today");
      return;
    }

    const roles = await prisma.role.findMany({
      where: {
        id: {
          in: [...todaysValueByRoleId.keys()],
        },
      },
      select: {
        id: true,
        name: true,
        maxLevel: true,
        assignments: {
          where: {
            citizen: ACTIVE_CITIZEN_WHERE,
          },
          select: {
            citizenId: true,
            currentLevel: true,
          },
        },
      },
    });

    const salaryDate = toDateColumnValue(today);
    const bookings = roles.flatMap((role) => {
      const value = todaysValueByRoleId.get(role.id);
      if (value === undefined) return [];

      /**
       * Only the direct assignments get a salary, not the inherited roles
       * (decision of 2026-09-27). A role with levels pays only at its maximum
       * level, the same level gate as for the permissions.
       */
      const paidAssignments = role.assignments.filter((assignment) =>
        hasReachedMaxLevel({ currentLevel: assignment.currentLevel, role }),
      );

      return paidAssignments.map((assignment) => ({
        receiverId: assignment.citizenId,
        value,
        description: `Gehalt: ${role.name}`,
        salaryRoleId: role.id,
        salaryDate,
      }));
    });

    const createdTransactions = await prisma.$transaction(
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

    if (createdTransactions.length <= 0) {
      log.info("The salaries of today are paid already");
      return;
    }

    await createAuditEvents([
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
          disbursedValue: createdTransactions.reduce(
            (total, booking) => total + booking.value,
            0,
          ),
        },
      },
    ]);

    await emitEvents([
      {
        Source: "MidnightAutomations",
        DetailType: "NotificationRequested",
        Detail: JSON.stringify({
          type: "SilcTransactionsCreated",
          payload: {
            transactionIds: createdTransactions.map((booking) => booking.id),
          },
          requestId: createId(),
        }),
      },
    ]);

    log.info("Disbursed role salaries");
  });
};
