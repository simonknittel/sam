import { prisma } from "@sam-monorepo/database";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { truncateAllTables } from "../../test/database";
import { disburseRoleSalaries } from "./disburseRoleSalaries";

/** A payout day in Europe/Berlin, the time zone of the function */
const NOW = new Date("2026-09-15T10:00:00+02:00");
const PAYOUT_DAY = 15;
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

  test("two salaries of one role on the same day are one booking", async () => {
    const { role, citizen } = await createCitizenWithRole();
    await prisma.silcRoleSalary.createMany({
      data: [
        { roleId: role.id, value: SALARY, dayOfMonth: PAYOUT_DAY },
        { roleId: role.id, value: 2 * SALARY, dayOfMonth: PAYOUT_DAY },
      ],
    });

    await disburseRoleSalaries();

    const transactions = await prisma.silcTransaction.findMany({
      where: { receiverId: citizen.id },
    });
    expect(transactions).toHaveLength(1);
    expect(transactions[0]?.value).toBe(3 * SALARY);
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
