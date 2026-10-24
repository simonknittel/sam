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
