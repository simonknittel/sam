import { prisma, type Entity, type Role } from "@sam-monorepo/database";
import { log } from "../../common/logger";
import { captureAsyncFunc } from "../../common/xray";
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
      orderBy: {
        handle: "asc",
      },
      include: {
        roleAssignments: true,
      },
    });

    if (allCitizens.length <= 0) {
      log.info("No citizens with roles found");
      return;
    }

    const citizensGroupedByRole = new Map<
      string,
      {
        role: Role;
        citizens: Entity[];
      }
    >();

    const allRoles = await prisma.role.findMany();

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

    for (const salary of todaysSalaries) {
      const group = citizensGroupedByRole.get(salary.roleId);
      if (!group) continue;

      await prisma.silcTransaction.createMany({
        data: group.citizens.map((citizen) => ({
          receiverId: citizen.id,
          value: salary.value,
          description: `Gehalt: ${group.role.name}`,
        })),
      });
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

    log.info("Disbursed role salaries");
  });
};
