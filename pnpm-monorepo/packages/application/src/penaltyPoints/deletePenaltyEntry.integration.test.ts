import { prisma } from "@sam-monorepo/database";
import { beforeEach, expect, test } from "vitest";
import {
  createTestActor,
  createTestApplicationContext,
  TEST_NOW,
} from "../../test/applicationContext.js";
import { truncateAllTables } from "../../test/database.js";
import { deletePenaltyEntry } from "./deletePenaltyEntry.js";

const ONE_DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

const createScenario = async () => {
  const [member, manager] = await Promise.all([
    prisma.citizen.create({ data: { handle: "member" } }),
    prisma.citizen.create({ data: { handle: "manager" } }),
  ]);

  return {
    member,
    manager,
    actor: createTestActor({
      userId: "manager",
      citizen: { id: manager.id, handle: manager.handle },
      permissionStrings: ["penaltyEntry;delete"],
    }),
  };
};

const createPenaltyEntry = (citizenId: string, expiresAt: Date | null) =>
  prisma.penaltyEntry.create({
    data: { citizenId, points: 3, reason: "Test", expiresAt },
  });

beforeEach(async () => {
  await truncateAllTables();
});

test("notifies the citizen only about the deletion of an entry that still counted", async () => {
  const { member, actor } = await createScenario();
  const neverExpires = await createPenaltyEntry(member.id, null);
  // An entry still counts at the time of its expiry
  const expiresNow = await createPenaltyEntry(member.id, TEST_NOW);
  const expired = await createPenaltyEntry(
    member.id,
    new Date(TEST_NOW.getTime() - ONE_DAY_IN_MILLISECONDS),
  );
  const { context, notifications } = createTestApplicationContext();

  for (const penaltyEntry of [neverExpires, expiresNow, expired]) {
    const output = await deletePenaltyEntry(context, actor, {
      penalty_entry_id: penaltyEntry.id,
    });
    expect(output.notifications_sent).toBe(true);
  }

  expect(notifications).toEqual(
    [neverExpires, expiresNow].map((penaltyEntry) => ({
      type: "PenaltyEntryDeleted",
      payload: { penaltyEntryId: penaltyEntry.id },
    })),
  );
});

test("does not notify the actor about the deletion of an own entry", async () => {
  const { manager, actor } = await createScenario();
  const ownEntry = await createPenaltyEntry(manager.id, null);
  const { context, notifications } = createTestApplicationContext();

  const output = await deletePenaltyEntry(context, actor, {
    penalty_entry_id: ownEntry.id,
  });

  expect(output.entry.deleted_at).toBe(TEST_NOW.toISOString());
  expect(notifications).toEqual([]);
});
