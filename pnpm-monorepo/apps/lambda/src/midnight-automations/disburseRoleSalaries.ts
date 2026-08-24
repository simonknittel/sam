import { createId } from "@paralleldrive/cuid2";
import { prisma, type Entity, type Role } from "@sam-monorepo/database";
import { AuditEventType } from "@sam-monorepo/domain";
import { createAuditEvents } from "../common/audit";
import { emitEvents } from "../common/eventbridge";
import { log } from "../common/logger";
import { captureAsyncFunc } from "../common/xray";
import { getRoleSalaries } from "./getRoleSalaries";
import { updateCitizensSilcBalances } from "./updateCitizensSilcBalances";

export const disburseRoleSalaries = async () => {
  await captureAsyncFunc("disburseRoleSalaries", async () => {
    const salaries = await getRoleSalaries();
    const now = new Date();

    const todaysSalaries = salaries.filter(
      (salary) => salary.dayOfMonth === now.getDate(),
    );

    const allCitizens = await prisma.entity.findMany({
      where: {
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
        citizens: Pick<Entity, "id">[];
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

    for (const salary of todaysSalaries) {
      const group = citizensGroupedByRole.get(salary.roleId);
      if (!group) continue;

      disbursedRoleIds.push(salary.roleId);
      disbursedValue += salary.value * group.citizens.length;

      const createdTransactions =
        await prisma.silcTransaction.createManyAndReturn({
          data: group.citizens.map((citizen) => ({
            receiverId: citizen.id,
            value: salary.value,
            description: `Gehalt: ${group.role.name}`,
          })),
          select: {
            id: true,
          },
        });

      allTransactionIds.push(...createdTransactions.map((t) => t.id));
    }

    /**
     * Update citizens' balances
     */
    const citizenIds = todaysSalaries.flatMap(
      (salary) =>
        citizensGroupedByRole
          .get(salary.roleId)
          ?.citizens.map((citizen) => citizen.id) || [],
    );
    await updateCitizensSilcBalances(citizenIds);

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
