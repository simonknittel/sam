import { prisma } from "@sam-monorepo/database";
import { AuditEventType } from "@sam-monorepo/domain";
import { beforeEach, expect, test } from "vitest";
import {
  createTestActor,
  createTestApplicationContext,
} from "../../test/applicationContext.js";
import { truncateAllTables } from "../../test/database.js";
import { expireAllSilc } from "./expireAllSilc.js";

const createCitizenWithLedger = async (
  handle: string,
  values: readonly number[],
) => {
  const citizen = await prisma.citizen.create({ data: { handle } });
  await prisma.silcTransaction.createMany({
    data: values.map((value) => ({ receiverId: citizen.id, value })),
  });

  return citizen;
};

beforeEach(async () => {
  await truncateAllTables();
});

test("the positive balances expire and the negative balances are reset to 0", async () => {
  const pilot = await createCitizenWithLedger("pilot", [100]);
  const debtor = await createCitizenWithLedger("debtor", [10, -50]);
  const manager = await prisma.citizen.create({ data: { handle: "manager" } });
  const actor = createTestActor({
    userId: "manager-user",
    citizen: { id: manager.id, handle: manager.handle },
    permissionStrings: ["silcBalanceOfOtherCitizen;manage"],
  });
  const { context, auditEvents } = createTestApplicationContext();

  const output = await expireAllSilc(context, actor);

  expect(output).toEqual({
    citizen_count: 1,
    expired_value: 100,
    reset_citizen_count: 1,
    reset_value: 40,
  });
  expect(auditEvents).toEqual([
    {
      type: AuditEventType.SILC_ALL_EXPIRED_V2,
      data: {
        expiredCitizenCount: 1,
        expiredValue: 100,
        resetCitizenCount: 1,
        resetValue: 40,
      },
      createdById: "manager-user",
    },
  ]);

  expect(
    await prisma.citizen.findMany({
      where: { id: { in: [pilot.id, debtor.id] } },
      select: { handle: true, silcBalance: true, totalEarnedSilc: true },
      orderBy: { handle: "asc" },
    }),
  ).toEqual([
    { handle: "debtor", silcBalance: 0, totalEarnedSilc: 10 },
    { handle: "pilot", silcBalance: 0, totalEarnedSilc: 100 },
  ]);
});
