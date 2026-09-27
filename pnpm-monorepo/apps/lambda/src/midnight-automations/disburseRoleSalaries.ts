import { createId } from "@paralleldrive/cuid2";
import { prisma, type Citizen, type Role } from "@sam-monorepo/database";
import {
  ACTIVE_CITIZEN_WHERE,
  AuditEventType,
  getLocalDate,
  ORGANIZATION_TIMEZONE,
  toDateColumnValue,
} from "@sam-monorepo/domain";
import { createAuditEvents } from "../common/audit";
import { emitEvents } from "../common/eventbridge";
import { log } from "../common/logger";
import { captureAsyncFunc } from "../common/xray";
import { getRoleSalaries } from "./getRoleSalaries";
import { updateCitizensSilcBalances } from "./updateCitizensSilcBalances";

export const disburseRoleSalaries = async () => {
  await captureAsyncFunc("disburseRoleSalaries", async () => {
    const salaries = await getRoleSalaries();
    const today = getLocalDate(new Date(), ORGANIZATION_TIMEZONE);
    const salaryDate = toDateColumnValue(today);

    /**
     * One booking for each role and citizen and day: the unique index on the
     * source columns allows no second one, thus several salaries of one role
     * on the same day are added up.
     */
    const todaysValueByRoleId = new Map<string, number>();
    for (const salary of salaries) {
      if (salary.dayOfMonth !== today.day) continue;

      todaysValueByRoleId.set(
        salary.roleId,
        (todaysValueByRoleId.get(salary.roleId) ?? 0) + salary.value,
      );
    }

    const allCitizens = await prisma.citizen.findMany({
      where: {
        ...ACTIVE_CITIZEN_WHERE,
        roleAssignments: {
          some: {},
        },
      },
      select: {
        id: true,
        roleAssignments: {
          select: {
            roleId: true,
          },
        },
      },
    });

    if (allCitizens.length <= 0) {
      log.info("No citizens with roles found");
      return;
    }

    const citizensGroupedByRole = new Map<
      string,
      {
        role: Pick<Role, "id" | "name">;
        citizens: Pick<Citizen, "id">[];
      }
    >();

    const allRoles = await prisma.role.findMany({
      select: {
        id: true,
        name: true,
      },
    });

    if (allRoles.length <= 0) {
      log.info("No roles found");
      return;
    }

    for (const citizen of allCitizens) {
      for (const roleAssignment of citizen.roleAssignments) {
        const role = allRoles.find((r) => r.id === roleAssignment.roleId);

        if (role) {
          if (!citizensGroupedByRole.has(role.id)) {
            citizensGroupedByRole.set(role.id, { role, citizens: [] });
          }

          citizensGroupedByRole.get(role.id)?.citizens.push(citizen);
        }
      }
    }

    const allTransactionIds: string[] = [];
    const disbursedRoleIds: string[] = [];
    let disbursedValue = 0;

    const citizenIds = new Set<string>();

    for (const [roleId, value] of todaysValueByRoleId) {
      const group = citizensGroupedByRole.get(roleId);
      if (!group) continue;

      /**
       * A run that repeats (for example after an error in a later job) skips
       * the bookings that exist already, see `SilcTransaction_salary_key`.
       */
      const createdTransactions =
        await prisma.silcTransaction.createManyAndReturn({
          data: group.citizens.map((citizen) => ({
            receiverId: citizen.id,
            value,
            description: `Gehalt: ${group.role.name}`,
            salaryRoleId: roleId,
            salaryDate,
          })),
          skipDuplicates: true,
          select: {
            id: true,
          },
        });

      // Also after a skipped booking: an earlier run can have stopped
      // between the booking and the balance update below.
      for (const citizen of group.citizens) citizenIds.add(citizen.id);

      if (createdTransactions.length === 0) continue;

      disbursedRoleIds.push(roleId);
      disbursedValue += value * createdTransactions.length;
      allTransactionIds.push(
        ...createdTransactions.map((transaction) => transaction.id),
      );
    }

    /**
     * Update citizens' balances
     */
    await updateCitizensSilcBalances([...citizenIds]);

    if (allTransactionIds.length > 0) {
      await createAuditEvents([
        {
          type: AuditEventType.ROLE_SALARIES_DISBURSED,
          data: {
            roleIds: disbursedRoleIds,
            transactionCount: allTransactionIds.length,
            disbursedValue,
          },
        },
      ]);
    }

    /**
     * Trigger notifications
     */
    if (allTransactionIds.length > 0) {
      await emitEvents([
        {
          Source: "MidnightAutomations",
          DetailType: "NotificationRequested",
          Detail: JSON.stringify({
            type: "SilcTransactionsCreated",
            payload: {
              transactionIds: allTransactionIds,
            },
            requestId: createId(),
          }),
        },
      ]);
    }

    log.info("Disbursed role salaries");
  });
};
