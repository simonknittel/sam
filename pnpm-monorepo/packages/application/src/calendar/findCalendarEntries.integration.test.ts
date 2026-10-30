import { prisma } from "@sam-monorepo/database";
import {
  EventSource,
  EventVisibility,
  TaskRewardType,
  TaskVisibility,
} from "@sam-monorepo/database/browser";
import type { Prisma } from "@sam-monorepo/database/client";
import {
  AuditEventType,
  CalendarEntryType,
  type LocalDateRange,
} from "@sam-monorepo/domain";
import { beforeEach, describe, expect, test } from "vitest";
import {
  createTestActor,
  createTestApplicationContext,
} from "../../test/applicationContext.js";
import { createCitizenWithPermissions } from "../../test/citizensWithPermissions.js";
import { truncateAllTables } from "../../test/database.js";
import { ValidationError } from "../errors.js";
import type { CalendarEntry } from "./calendarEntry.js";
import {
  CalendarErrorMessage,
  findCalendarEntries,
} from "./findCalendarEntries.js";
import { findOwnCalendarEntryTypeSettings } from "./findOwnCalendarEntryTypeSettings.js";
import { updateCalendarEntryTypeSettings } from "./updateCalendarEntryTypeSettings.js";

/** Monday, 2026-06-15, 12:00 in Europe/Berlin */
const NOW = new Date("2026-06-15T10:00:00.000Z");

const JUNE: LocalDateRange = {
  start: { year: 2026, month: 6, day: 1 },
  end: { year: 2026, month: 6, day: 30 },
};

/** The permissions of all entry types */
const ALL_TYPE_PERMISSIONS = [
  "event;read",
  "citizen;read",
  "task;read",
  "silcBalanceOfCurrentCitizen;read",
  "profitDistributionCycle;read",
  "ownPenaltyEntry;read",
];

const LOGIN_PERMISSION = "login;manage";

const toKeys = (entries: readonly CalendarEntry[]) =>
  entries.map((entry) => entry.key);

const createViewerActor = async (permissionStrings: readonly string[]) => {
  const citizen = await createCitizenWithPermissions("viewer", [
    LOGIN_PERMISSION,
  ]);

  return {
    citizen,
    actor: createTestActor({
      userId: "viewer-user",
      citizen: { id: citizen.id, handle: citizen.handle },
      permissionStrings,
    }),
  };
};

const createTaskWithAssignee = (
  title: string,
  citizenId: string,
  data: Partial<Prisma.TaskUncheckedCreateInput> = {},
) =>
  prisma.task.create({
    data: {
      title,
      rewardType: TaskRewardType.TEXT,
      rewardTypeTextValue: "Ruhm",
      visibility: TaskVisibility.PUBLIC,
      expiresAt: new Date("2026-06-21T10:00:00.000Z"),
      assignments: { create: { citizenId } },
      ...data,
    },
  });

beforeEach(async () => {
  await truncateAllTables();
});

describe("findCalendarEntries", () => {
  test("each type shows only the entries that the actor may see", async () => {
    const salaryRole = await prisma.role.create({
      data: {
        name: "Pilot",
        silcSalaries: {
          create: [
            { value: 100, dayOfMonth: 4 },
            // June has no 31st, thus the salary is due on June 30
            { value: 50, dayOfMonth: 31 },
          ],
        },
      },
    });
    // The actor cannot see this role, thus its name stays out
    const hiddenSalaryRole = await prisma.role.create({
      data: {
        name: "Hidden salary role",
        silcSalaries: {
          create: [
            { value: 30, dayOfMonth: 4 },
            { value: 20, dayOfMonth: 31 },
          ],
        },
      },
    });
    const { citizen: viewer, actor } = await createViewerActor([
      ...ALL_TYPE_PERMISSIONS,
      `otherRole;read;roleId=${salaryRole.id}`,
    ]);
    const other = await createCitizenWithPermissions(
      "other",
      [LOGIN_PERMISSION],
      [],
      { birthdayDay: 10, birthdayMonth: 6 },
    );
    // Cannot sign in, thus the calendar leaves the birthday out
    await prisma.citizen.create({
      data: { handle: "no-login", birthdayDay: 11, birthdayMonth: 6 },
    });

    const restrictedRole = await prisma.role.create({
      data: { name: "Restricted" },
    });
    const publicEvent = await prisma.event.create({
      data: {
        source: EventSource.APP,
        name: "Public",
        startTime: new Date("2026-06-20T18:00:00.000Z"),
      },
    });
    await prisma.event.create({
      data: {
        source: EventSource.APP,
        name: "Restricted",
        startTime: new Date("2026-06-20T18:00:00.000Z"),
        visibility: EventVisibility.RESTRICTED,
        visibilityRoles: { create: { roleId: restrictedRole.id } },
      },
    });

    const ownTask = await createTaskWithAssignee("Own", viewer.id);
    await createTaskWithAssignee("Own cancelled", viewer.id, {
      cancelledAt: NOW,
    });
    await createTaskWithAssignee("Own deleted", viewer.id, { deletedAt: NOW });
    await createTaskWithAssignee("Other", other.id);

    await prisma.roleAssignment.createMany({
      data: [
        { citizenId: viewer.id, roleId: salaryRole.id },
        { citizenId: other.id, roleId: salaryRole.id },
        { citizenId: viewer.id, roleId: hiddenSalaryRole.id },
      ],
    });
    for (const { receiverId, role } of [
      { receiverId: viewer.id, role: salaryRole },
      { receiverId: viewer.id, role: hiddenSalaryRole },
      { receiverId: other.id, role: salaryRole },
    ])
      await prisma.silcTransaction.create({
        data: {
          receiverId,
          value: role === salaryRole ? 100 : 30,
          salaryRoleId: role.id,
          salaryDate: new Date("2026-06-04T00:00:00.000Z"),
        },
      });

    const ownPenaltyEntry = await prisma.penaltyEntry.create({
      data: {
        citizenId: viewer.id,
        points: 2,
        expiresAt: new Date("2026-06-25T10:00:00.000Z"),
      },
    });
    await prisma.penaltyEntry.create({
      data: {
        citizenId: viewer.id,
        points: 3,
        expiresAt: new Date("2026-06-25T10:00:00.000Z"),
        deletedAt: NOW,
      },
    });
    await prisma.penaltyEntry.create({
      data: {
        citizenId: other.id,
        points: 4,
        expiresAt: new Date("2026-06-25T10:00:00.000Z"),
      },
    });

    // Of two cycles in the collection phase, a member sees only the first
    const visibleCycle = await prisma.profitDistributionCycle.create({
      data: {
        title: "Visible",
        collectionEndsAt: new Date("2026-06-28T10:00:00.000Z"),
      },
    });
    await prisma.profitDistributionCycle.create({
      data: {
        title: "Hidden",
        collectionEndsAt: new Date("2026-06-20T10:00:00.000Z"),
      },
    });

    const { context } = createTestApplicationContext({ now: NOW });
    const entries = await findCalendarEntries(context, actor, {
      range: JUNE,
    });

    expect(toKeys(entries)).toEqual([
      "silc_salary:2026-06-04",
      `birthday:${other.id}:2026-06-10`,
      `event:${publicEvent.id}`,
      `task_deadline:${ownTask.id}`,
      `penalty_expiry:${ownPenaltyEntry.id}`,
      `profit_distribution:${visibleCycle.id}:collection`,
      "silc_salary:2026-06-30",
    ]);
    expect(
      entries.flatMap((entry) =>
        entry.type === CalendarEntryType.SilcSalary
          ? [
              {
                value: entry.value,
                roleNames: entry.roleNames,
              },
            ]
          : [],
      ),
    ).toEqual([
      // The booking of the past day, then the forecast of today
      { value: 130, roleNames: ["Pilot"] },
      { value: 70, roleNames: ["Pilot"] },
    ]);
  });

  test("an actor without permissions and without a citizen sees only the seasonal entries", async () => {
    const actor = createTestActor({ userId: "guest-user" });
    await createCitizenWithPermissions("birthday", [LOGIN_PERMISSION], [], {
      birthdayDay: 24,
      birthdayMonth: 12,
    });
    await prisma.event.create({
      data: {
        source: EventSource.APP,
        name: "Christmas party",
        startTime: new Date("2026-12-24T18:00:00.000Z"),
      },
    });
    const { context } = createTestApplicationContext({ now: NOW });

    const entries = await findCalendarEntries(context, actor, {
      range: {
        start: { year: 2026, month: 12, day: 20 },
        end: { year: 2027, month: 1, day: 5 },
      },
    });

    expect(toKeys(entries)).toEqual([
      "seasonal:christmas:2026-12-24",
      "seasonal:christmas:2026-12-25",
      "seasonal:christmas:2026-12-26",
      "seasonal:new-year:2027-01-01",
    ]);
  });

  test("the option of the dashboard tile adds the events that run now", async () => {
    const { actor } = await createViewerActor(["event;read"]);
    const runningEvent = await prisma.event.create({
      data: {
        source: EventSource.APP,
        name: "Running",
        startTime: new Date("2026-06-14T10:00:00.000Z"),
        endTime: new Date("2026-06-16T10:00:00.000Z"),
      },
    });
    const { context } = createTestApplicationContext({ now: NOW });
    const nextSevenDays = {
      start: { year: 2026, month: 6, day: 15 },
      end: { year: 2026, month: 6, day: 21 },
    };

    expect(
      await findCalendarEntries(context, actor, { range: nextSevenDays }),
    ).toEqual([]);
    expect(
      toKeys(
        await findCalendarEntries(context, actor, {
          range: nextSevenDays,
          includeRunningEvents: true,
        }),
      ),
    ).toEqual([`event:${runningEvent.id}`]);
  });

  test("a range can hold at most 12 months", async () => {
    const actor = createTestActor({ userId: "guest-user" });
    const { context } = createTestApplicationContext({ now: NOW });
    const start = { year: 2026, month: 6, day: 15 };

    await expect(
      findCalendarEntries(context, actor, {
        range: { start, end: { year: 2027, month: 6, day: 15 } },
      }),
    ).resolves.toBeDefined();
    await expect(
      findCalendarEntries(context, actor, {
        range: { start, end: { year: 2027, month: 6, day: 16 } },
      }),
    ).rejects.toThrow(new ValidationError(CalendarErrorMessage.RangeTooLong));
  });
});

describe("updateCalendarEntryTypeSettings", () => {
  test("a type that the citizen switched off stays off and is not collected", async () => {
    const { citizen: viewer, actor } = await createViewerActor([
      "citizen;read",
    ]);
    const other = await createCitizenWithPermissions(
      "other",
      [LOGIN_PERMISSION],
      [],
      { birthdayDay: 10, birthdayMonth: 6 },
    );
    const { context, auditEvents } = createTestApplicationContext({
      now: NOW,
    });

    expect(
      await updateCalendarEntryTypeSettings(context, actor, {
        enabled_types: [CalendarEntryType.Seasonal],
      }),
    ).toEqual({ enabled: [], disabled: [CalendarEntryType.Birthday] });
    expect(auditEvents).toEqual([
      {
        type: AuditEventType.CALENDAR_ENTRY_TYPE_SETTINGS_UPDATED,
        data: {
          citizenId: viewer.id,
          enabled: [],
          disabled: [CalendarEntryType.Birthday],
        },
        createdById: "viewer-user",
      },
    ]);
    expect(await findOwnCalendarEntryTypeSettings(context, actor)).toEqual([
      { type: CalendarEntryType.Birthday, enabled: false },
      { type: CalendarEntryType.Seasonal, enabled: true },
    ]);
    expect(await findCalendarEntries(context, actor, { range: JUNE })).toEqual(
      [],
    );

    await updateCalendarEntryTypeSettings(context, actor, {
      enabled_types: [CalendarEntryType.Birthday, CalendarEntryType.Seasonal],
    });

    expect(
      toKeys(await findCalendarEntries(context, actor, { range: JUNE })),
    ).toEqual([`birthday:${other.id}:2026-06-10`]);
    expect(
      await prisma.calendarEntryTypeSetting.count({
        where: { citizenId: viewer.id },
      }),
    ).toBe(0);
  });
});
