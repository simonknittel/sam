import { prisma } from "@sam-monorepo/database";
import { EventSource } from "@sam-monorepo/database/client";
import { beforeEach, expect, test } from "vitest";
import {
  createTestActor,
  createTestApplicationContext,
  TEST_NOW,
} from "../../test/applicationContext.js";
import { truncateAllTables } from "../../test/database.js";
import { addEventManagers } from "./addEventManagers.js";

const HOUR_IN_MILLISECONDS = 60 * 60 * 1000;

beforeEach(async () => {
  await truncateAllTables();
});

test("only a new manager other than the actor gets a notification", async () => {
  const [organizer, existingManager, newManager] = await Promise.all(
    ["organizer", "existing", "new"].map((handle) =>
      prisma.citizen.create({
        data: { handle },
        select: { id: true, handle: true },
      }),
    ),
  );
  const event = await prisma.event.create({
    data: {
      source: EventSource.APP,
      name: "Einsatz",
      startTime: new Date(TEST_NOW.getTime() + HOUR_IN_MILLISECONDS),
      createdById: organizer!.id,
      managers: { connect: { id: existingManager!.id } },
    },
  });
  const actor = createTestActor({
    userId: `user-${organizer!.id}`,
    citizen: organizer,
    permissionStrings: ["event;read"],
  });
  const { context, notifications } = createTestApplicationContext();

  const output = await addEventManagers(context, actor, {
    event_id: event.id,
    citizen_ids: [newManager!.id, existingManager!.id, organizer!.id],
  });

  expect(output.managers.map((manager) => manager.id).toSorted()).toEqual(
    [organizer!.id, existingManager!.id, newManager!.id].toSorted(),
  );
  expect(notifications).toEqual([
    {
      type: "EventManagerAdded",
      payload: { eventId: event.id, citizenId: newManager!.id },
    },
  ]);
});
