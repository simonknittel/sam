import { prisma } from "@sam-monorepo/database";
import { EventSource } from "@sam-monorepo/database/client";
import { beforeEach, expect, test } from "vitest";
import {
  createTestActor,
  createTestApplicationContext,
  TEST_NOW,
} from "../../test/applicationContext.js";
import { truncateAllTables } from "../../test/database.js";
import { updateEvent, type UpdateEventInput } from "./updateEvent.js";

const HOUR_IN_MILLISECONDS = 60 * 60 * 1000;

const hoursFromNow = (hours: number) =>
  new Date(TEST_NOW.getTime() + hours * HOUR_IN_MILLISECONDS);

beforeEach(async () => {
  await truncateAllTables();
});

test("a new start sends rescheduled, the other changes send updated", async () => {
  const organizer = await prisma.citizen.create({
    data: { handle: "organizer" },
    select: { id: true, handle: true },
  });
  const actor = createTestActor({
    userId: `user-${organizer.id}`,
    citizen: organizer,
    permissionStrings: ["event;read"],
  });
  const event = await prisma.event.create({
    data: {
      source: EventSource.APP,
      name: "Einsatz",
      startTime: hoursFromNow(1),
      endTime: hoursFromNow(3),
      createdById: organizer.id,
    },
  });

  /** The types of the notifications of one update */
  const update = async (input: Omit<UpdateEventInput, "event_id">) => {
    const { context, notifications } = createTestApplicationContext();
    await updateEvent(context, actor, { event_id: event.id, ...input });

    return notifications.map((notification) => notification.type);
  };

  // The start and the end move together
  expect(
    await update({ start_time: hoursFromNow(2), end_time: hoursFromNow(4) }),
  ).toEqual(["EventRescheduled"]);
  expect(await update({ end_time: hoursFromNow(5) })).toEqual(["EventUpdated"]);
  expect(await update({ start_time: hoursFromNow(1), name: "Neu" })).toEqual([
    "EventRescheduled",
    "EventUpdated",
  ]);
});
