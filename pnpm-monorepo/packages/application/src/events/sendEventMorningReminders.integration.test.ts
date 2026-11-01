import { prisma } from "@sam-monorepo/database";
import { EventSource } from "@sam-monorepo/database/client";
import { beforeEach, expect, test } from "vitest";
import { createTestApplicationContext } from "../../test/applicationContext.js";
import { truncateAllTables } from "../../test/database.js";
import { sendEventMorningReminders } from "./sendEventMorningReminders.js";

/** 2026-11-02 07:30 in Europe/Berlin (UTC+1) */
const REMINDER_TIME = new Date("2026-11-02T07:30:00+01:00");

enum Participation {
  Active = "active",
  Cancelled = "cancelled",
  None = "none",
}

const createEvent = async (
  startTime: string,
  participation: Participation,
  deletedAt: Date | null = null,
) => {
  const citizen = await prisma.citizen.create({ data: {} });

  return prisma.event.create({
    data: {
      source: EventSource.APP,
      name: "Einsatz",
      startTime: new Date(startTime),
      deletedAt,
      participants:
        participation === Participation.None
          ? undefined
          : {
              create: {
                source: EventSource.APP,
                citizenId: citizen.id,
                cancelledAt:
                  participation === Participation.Cancelled
                    ? REMINDER_TIME
                    : null,
              },
            },
    },
  });
};

beforeEach(async () => {
  await truncateAllTables();
});

test("the run at 07:30 requests one reminder for each event of the participants from 07:30 until 07:29 of the next day", async () => {
  const atWindowStart = await createEvent(
    "2026-11-02T07:30:00+01:00",
    Participation.Active,
  );
  const inTheEvening = await createEvent(
    "2026-11-02T20:00:00+01:00",
    Participation.Active,
  );
  const atWindowEnd = await createEvent(
    "2026-11-03T07:29:00+01:00",
    Participation.Active,
  );
  await createEvent("2026-11-02T07:29:00+01:00", Participation.Active);
  await createEvent("2026-11-03T07:30:00+01:00", Participation.Active);
  await createEvent(
    "2026-11-02T20:00:00+01:00",
    Participation.Active,
    REMINDER_TIME,
  );
  await createEvent("2026-11-02T20:00:00+01:00", Participation.Cancelled);
  await createEvent("2026-11-02T20:00:00+01:00", Participation.None);

  const { context, notifications } = createTestApplicationContext({
    now: REMINDER_TIME,
  });

  await expect(sendEventMorningReminders(context)).resolves.toEqual({
    isReminderRun: true,
    eventCount: 3,
    notificationsSent: true,
  });
  expect(notifications).toHaveLength(3);
  expect(notifications).toEqual(
    expect.arrayContaining(
      [atWindowStart, inTheEvening, atWindowEnd].map((event) => ({
        type: "EventMorningReminder",
        payload: { eventId: event.id },
      })),
    ),
  );
});

test("the other runs of the day request no reminder", async () => {
  await createEvent("2026-11-02T20:00:00+01:00", Participation.Active);

  for (const now of [
    "2026-11-02T07:15:00+01:00",
    "2026-11-02T07:45:00+01:00",
  ]) {
    const { context, notifications } = createTestApplicationContext({
      now: new Date(now),
    });

    await expect(sendEventMorningReminders(context)).resolves.toEqual({
      isReminderRun: false,
      eventCount: 0,
      notificationsSent: true,
    });
    expect(notifications).toEqual([]);
  }
});
