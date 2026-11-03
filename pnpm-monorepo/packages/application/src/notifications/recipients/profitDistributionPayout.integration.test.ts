import { prisma } from "@sam-monorepo/database";
import { beforeEach, expect, test } from "vitest";
import {
  createTestApplicationContext,
  TEST_NOW,
} from "../../../test/applicationContext.js";
import { createCitizenWithPermissions } from "../../../test/citizensWithPermissions.js";
import { truncateAllTables } from "../../../test/database.js";
import {
  findPayoutDisbursedRecipients,
  findPayoutReminderRecipients,
  findPayoutStartedRecipients,
} from "./profitDistributionPayout.js";

beforeEach(async () => {
  await truncateAllTables();
});

test("the payout notifications reach only the participants who can open the cycle", async () => {
  const reader = await createCitizenWithPermissions("reader", [
    "login;manage",
    "profitDistributionCycle;read",
  ]);
  const outsider = await createCitizenWithPermissions("outsider", [
    "login;manage",
  ]);
  const cycle = await prisma.profitDistributionCycle.create({
    data: {
      title: "Zyklus",
      collectionEndsAt: TEST_NOW,
      auecProfit: 1_000,
      participants: {
        create: [
          { citizenId: reader.id, silcBalanceSnapshot: 1 },
          { citizenId: outsider.id, silcBalanceSnapshot: 1 },
        ],
      },
    },
  });
  const { context } = createTestApplicationContext();

  const started = await findPayoutStartedRecipients(context, {
    cycleId: cycle.id,
  });
  const disbursed = await findPayoutDisbursedRecipients(context, {
    cycleId: cycle.id,
    changes: [reader.id, outsider.id].map((citizenId) => ({
      citizenId,
      attribute: "disbursed",
      enabled: true,
    })),
  });

  expect(started?.recipients).toEqual([{ citizenId: reader.id }]);
  expect(disbursed?.recipients).toEqual([
    { citizenId: reader.id, auecAmount: 500 },
  ]);
});

test("the payout reminder reaches only the participants who must accept their payout and can open the cycle", async () => {
  const permissionStrings = ["login;manage", "profitDistributionCycle;read"];
  const [awaiting, accepted, ceded, disbursed, outsider] = await Promise.all([
    createCitizenWithPermissions("awaiting", permissionStrings),
    createCitizenWithPermissions("accepted", permissionStrings),
    createCitizenWithPermissions("ceded", permissionStrings),
    createCitizenWithPermissions("disbursed", permissionStrings),
    createCitizenWithPermissions("outsider", ["login;manage"]),
  ]);
  const payoutEndsAt = new Date("2026-06-16T22:00:00.000Z");
  const cycle = await prisma.profitDistributionCycle.create({
    data: {
      title: "Zyklus",
      collectionEndsAt: TEST_NOW,
      collectionEndedAt: TEST_NOW,
      payoutStartedAt: TEST_NOW,
      payoutEndsAt,
      participants: {
        create: [
          { citizenId: awaiting.id },
          { citizenId: accepted.id, acceptedAt: TEST_NOW },
          { citizenId: ceded.id, cededAt: TEST_NOW },
          { citizenId: disbursed.id, disbursedAt: TEST_NOW },
          { citizenId: outsider.id },
        ],
      },
    },
  });
  const { context } = createTestApplicationContext();
  const input = { cycleId: cycle.id };

  expect(await findPayoutReminderRecipients(context, input)).toEqual({
    cycle: { id: cycle.id, title: "Zyklus", payoutEndsAt },
    recipients: [{ citizenId: awaiting.id }],
  });

  await prisma.profitDistributionCycle.update({
    where: { id: cycle.id },
    data: { payoutEndedAt: TEST_NOW },
  });

  expect(
    (await findPayoutReminderRecipients(context, input))?.recipients,
  ).toEqual([]);
});
