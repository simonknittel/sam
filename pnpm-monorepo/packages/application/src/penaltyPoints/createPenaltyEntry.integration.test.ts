import { prisma } from "@sam-monorepo/database";
import { beforeEach, expect, test } from "vitest";
import {
  createTestActor,
  createTestApplicationContext,
} from "../../test/applicationContext.js";
import { truncateAllTables } from "../../test/database.js";
import { createPenaltyEntry } from "./createPenaltyEntry.js";

beforeEach(async () => {
  await truncateAllTables();
});

test("notifies the citizen about the new entry, but not the actor about points for the own citizen", async () => {
  const [member, manager] = await Promise.all([
    prisma.citizen.create({ data: { handle: "member" } }),
    prisma.citizen.create({ data: { handle: "manager" } }),
  ]);
  const actor = createTestActor({
    userId: "manager",
    citizen: { id: manager.id, handle: manager.handle },
    permissionStrings: ["penaltyEntry;create", "citizen;read"],
  });
  const { context, notifications } = createTestApplicationContext();

  const memberEntry = await createPenaltyEntry(context, actor, {
    citizen_id: member.id,
    points: 3,
  });
  await createPenaltyEntry(context, actor, {
    citizen_id: manager.id,
    points: 3,
  });

  expect(notifications).toEqual([
    {
      type: "PenaltyEntryCreated",
      payload: { penaltyEntryId: memberEntry.id },
    },
  ]);
});
