import { prisma } from "@sam-monorepo/database";
import { AuditEventType } from "@sam-monorepo/domain";
import { beforeEach, expect, test } from "vitest";
import { createTestApplicationContext } from "../../test/applicationContext.js";
import {
  CLEARED_USER,
  createCitizenWithPermissions,
} from "../../test/citizensWithPermissions.js";
import { truncateAllTables } from "../../test/database.js";
import { sendBirthdayGreetings } from "./sendBirthdayGreetings.js";
import { sendNewYearGreetings } from "./sendNewYearGreetings.js";

/** The interval of the schedule of the greeting automations */
const RUN_INTERVAL_IN_MILLISECONDS = 15 * 60 * 1000;

beforeEach(async () => {
  await truncateAllTables();
});

/** The greetings go only to the cleared citizens */
const LOGIN_PERMISSION_STRINGS = ["login;manage"];

test("greets a citizen once on the birthday in their own time zone", async () => {
  // 2026-12-25 00:05 in Pacific/Kiritimati (UTC+14), 2026-12-24 11:05 in Berlin
  const now = new Date("2026-12-24T10:05:00Z");
  const celebrant = await createCitizenWithPermissions(
    "kiritimati",
    LOGIN_PERMISSION_STRINGS,
    [],
    {
      ...CLEARED_USER,
      timezone: "Pacific/Kiritimati",
      birthdayDay: 25,
      birthdayMonth: 12,
    },
  );
  const sameDayInBerlin = await createCitizenWithPermissions(
    "berlin",
    LOGIN_PERMISSION_STRINGS,
    [],
    {
      ...CLEARED_USER,
      timezone: "Europe/Berlin",
      birthdayDay: 25,
      birthdayMonth: 12,
    },
  );

  const { context, notifications, auditEvents } = createTestApplicationContext({
    now,
  });

  await expect(sendBirthdayGreetings(context)).resolves.toEqual({
    candidateCount: 2,
    greetedCount: 1,
    notificationsSent: true,
  });
  expect(notifications).toEqual([
    { type: "BirthdayGreeting", payload: { citizenId: celebrant.id } },
  ]);
  expect(auditEvents).toEqual([
    {
      type: AuditEventType.BIRTHDAY_GREETINGS_SENT,
      data: { citizenCount: 1 },
      createdById: null,
    },
  ]);
  await expect(
    prisma.citizen.findUniqueOrThrow({ where: { id: celebrant.id } }),
  ).resolves.toMatchObject({ birthdayGreetingSentAt: now });
  await expect(
    prisma.citizen.findUniqueOrThrow({ where: { id: sameDayInBerlin.id } }),
  ).resolves.toMatchObject({ birthdayGreetingSentAt: null });

  // The next run greets nobody
  const secondRun = createTestApplicationContext({
    now: new Date(now.getTime() + RUN_INTERVAL_IN_MILLISECONDS),
  });

  await expect(sendBirthdayGreetings(secondRun.context)).resolves.toEqual({
    candidateCount: 2,
    greetedCount: 0,
    notificationsSent: true,
  });
  expect(secondRun.notifications).toEqual([]);
  expect(secondRun.auditEvents).toEqual([]);
});

test("greets a cleared citizen at the start of January 1 in their time zone", async () => {
  const now = new Date("2027-01-01T00:05:00+01:00");
  const citizen = await createCitizenWithPermissions(
    "berlin",
    LOGIN_PERMISSION_STRINGS,
    [],
    CLEARED_USER,
  );
  await createCitizenWithPermissions(
    "negated-login",
    [...LOGIN_PERMISSION_STRINGS, "login;negate"],
    [],
    CLEARED_USER,
  );

  const { context, notifications, auditEvents } = createTestApplicationContext({
    now,
  });

  await expect(sendNewYearGreetings(context)).resolves.toEqual({
    candidateCount: 1,
    greetedCount: 1,
    notificationsSent: true,
  });
  expect(notifications).toEqual([
    {
      type: "NewYearGreeting",
      payload: { citizenId: citizen.id, year: 2027 },
    },
  ]);
  expect(auditEvents).toEqual([
    {
      type: AuditEventType.NEW_YEAR_GREETINGS_SENT,
      data: { citizenCount: 1 },
      createdById: null,
    },
  ]);
  await expect(
    prisma.citizen.findUniqueOrThrow({ where: { id: citizen.id } }),
  ).resolves.toMatchObject({ newYearGreetingSentAt: now });
});

test("keeps the markers without an audit event when the notifications fail", async () => {
  const now = new Date("2027-01-01T00:05:00+01:00");
  const citizen = await createCitizenWithPermissions(
    "berlin",
    LOGIN_PERMISSION_STRINGS,
    [],
    CLEARED_USER,
  );

  const { context, auditEvents } = createTestApplicationContext({
    now,
    notifications: {
      trigger: async () => {
        throw new Error("EventBridge is not available");
      },
    },
  });

  await expect(sendNewYearGreetings(context)).resolves.toEqual({
    candidateCount: 1,
    greetedCount: 1,
    notificationsSent: false,
  });
  expect(auditEvents).toEqual([]);
  await expect(
    prisma.citizen.findUniqueOrThrow({ where: { id: citizen.id } }),
  ).resolves.toMatchObject({ newYearGreetingSentAt: now });
});
