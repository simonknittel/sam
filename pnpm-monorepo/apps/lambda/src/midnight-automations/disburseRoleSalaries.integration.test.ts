import { prisma } from "@sam-monorepo/database";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { truncateAllTables } from "../../test/database";
import { disburseRoleSalaries } from "./disburseRoleSalaries";

/** A payout day in Europe/Berlin, the time zone of the function */
const NOW = new Date("2026-09-15T10:00:00+02:00");
const PAYOUT_DAY = 15;
const LAST_DAY_OF_SEPTEMBER = new Date("2026-09-30T10:00:00+02:00");
const SALARY = 100;

const createCitizenWithRole = async () => {
  const role = await prisma.role.create({ data: { name: "Pilot" } });
  const citizen = await prisma.citizen.create({
    data: {
      handle: "citizen",
      roleAssignments: { create: { roleId: role.id } },
    },
  });

  return { role, citizen };
};

beforeEach(async () => {
  await truncateAllTables();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("disburseRoleSalaries", () => {
  test("a second run on the same day pays the salary one time", async () => {
    const { role, citizen } = await createCitizenWithRole();
    await prisma.silcRoleSalary.create({
      data: { roleId: role.id, value: SALARY, dayOfMonth: PAYOUT_DAY },
    });

    await disburseRoleSalaries();
    await disburseRoleSalaries();

    const transactions = await prisma.silcTransaction.findMany({
      where: { receiverId: citizen.id },
    });
    expect(transactions).toHaveLength(1);
    expect(transactions[0]?.value).toBe(SALARY);

    const { silcBalance } = await prisma.citizen.findUniqueOrThrow({
      where: { id: citizen.id },
    });
    expect(silcBalance).toBe(SALARY);
  });

  test("the last day of a short month pays the salaries of the missing days in one booking", async () => {
    vi.setSystemTime(LAST_DAY_OF_SEPTEMBER);
    const { role, citizen } = await createCitizenWithRole();
    await prisma.silcRoleSalary.createMany({
      data: [
        { roleId: role.id, value: SALARY, dayOfMonth: 30 },
        { roleId: role.id, value: 2 * SALARY, dayOfMonth: 31 },
      ],
    });

    await disburseRoleSalaries();

    const transactions = await prisma.silcTransaction.findMany({
      where: { receiverId: citizen.id },
    });
    expect(transactions).toHaveLength(1);
    expect(transactions[0]?.value).toBe(3 * SALARY);
  });

  test("a salary on the 31st is not paid before the last day of a short month", async () => {
    vi.setSystemTime(new Date("2026-09-29T10:00:00+02:00"));
    const { role, citizen } = await createCitizenWithRole();
    await prisma.silcRoleSalary.create({
      data: { roleId: role.id, value: SALARY, dayOfMonth: 31 },
    });

    await disburseRoleSalaries();

    expect(
      await prisma.silcTransaction.count({ where: { receiverId: citizen.id } }),
    ).toBe(0);
  });

  test("a deleted citizen gets no salary", async () => {
    const { role, citizen } = await createCitizenWithRole();
    await prisma.citizen.update({
      where: { id: citizen.id },
      data: { deletedAt: new Date() },
    });
    await prisma.silcRoleSalary.create({
      data: { roleId: role.id, value: SALARY, dayOfMonth: PAYOUT_DAY },
    });

    await disburseRoleSalaries();

    expect(
      await prisma.silcTransaction.count({ where: { receiverId: citizen.id } }),
    ).toBe(0);
  });

  test("a role with levels pays only at its maximum level", async () => {
    const role = await prisma.role.create({
      data: { name: "Staffelführer", maxLevel: 3 },
    });
    const [atMaximum] = await Promise.all(
      [3, 2].map((currentLevel) =>
        prisma.citizen.create({
          data: {
            handle: `level-${currentLevel}`,
            roleAssignments: { create: { roleId: role.id, currentLevel } },
          },
        }),
      ),
    );
    await prisma.silcRoleSalary.create({
      data: { roleId: role.id, value: SALARY, dayOfMonth: PAYOUT_DAY },
    });

    await disburseRoleSalaries();

    const receiverIds = (
      await prisma.silcTransaction.findMany({ select: { receiverId: true } })
    ).map((transaction) => transaction.receiverId);
    expect(receiverIds).toEqual([atMaximum?.id]);
  });

  test("only a direct assignment gets the salary, not an inherited role", async () => {
    const paidRole = await prisma.role.create({ data: { name: "Pilot" } });
    const inheritingRole = await prisma.role.create({
      data: { name: "Staffel", inherits: { connect: { id: paidRole.id } } },
    });
    const [directCitizen] = await Promise.all(
      [paidRole, inheritingRole].map((role) =>
        prisma.citizen.create({
          data: {
            handle: role.name,
            roleAssignments: { create: { roleId: role.id } },
          },
        }),
      ),
    );
    await prisma.silcRoleSalary.create({
      data: { roleId: paidRole.id, value: SALARY, dayOfMonth: PAYOUT_DAY },
    });

    await disburseRoleSalaries();

    expect(
      await prisma.silcTransaction.findMany({
        select: { receiverId: true, value: true },
      }),
    ).toEqual([{ receiverId: directCitizen?.id, value: SALARY }]);
  });

  test("a salary on another day is not paid", async () => {
    const { role, citizen } = await createCitizenWithRole();
    await prisma.silcRoleSalary.create({
      data: { roleId: role.id, value: SALARY, dayOfMonth: PAYOUT_DAY + 1 },
    });

    await disburseRoleSalaries();

    expect(
      await prisma.silcTransaction.count({ where: { receiverId: citizen.id } }),
    ).toBe(0);
  });
});
