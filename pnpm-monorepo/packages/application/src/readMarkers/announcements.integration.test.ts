import {
  EventSource,
  EventVisibility,
  prisma,
  TaskRewardType,
  TaskVisibility,
} from "@sam-monorepo/database";
import { AuditEventType, ReadMarkerSubject } from "@sam-monorepo/domain";
import { beforeEach, describe, expect, test } from "vitest";
import {
  createTestActor,
  createTestApplicationContext,
  TEST_NOW,
} from "../../test/applicationContext.js";
import { truncateAllTables } from "../../test/database.js";
import type { ChangelogSource } from "../context.js";
import { markAllOnSiteNotificationsRead } from "../notifications/markAllOnSiteNotificationsRead.js";
import { markOnSiteNotificationRead } from "../notifications/markOnSiteNotificationRead.js";
import { countNewItemsBySubject } from "./countNewItemsBySubject.js";
import { markItemAsRead } from "./markItemAsRead.js";
import { markItemsAsRead } from "./markItemsAsRead.js";

const READER_PERMISSION_STRINGS = ["task;read", "event;read"];

/** After the start of the tracking and after `TEST_NOW`, thus still open */
const EVENT_START_TIME = new Date("2026-12-01T18:00:00.000Z");

const createReader = async () => {
  const citizen = await prisma.citizen.create({ data: { handle: "reader" } });

  return {
    citizen,
    actor: createTestActor({
      userId: "reader-user",
      citizen,
      permissionStrings: READER_PERMISSION_STRINGS,
    }),
  };
};

const createTask = () =>
  prisma.task.create({
    data: {
      title: "Frachter eskortieren",
      visibility: TaskVisibility.PUBLIC,
      rewardType: TaskRewardType.TEXT,
      rewardTypeTextValue: "Ruhm und Ehre",
    },
  });

const createEvent = (visibility: EventVisibility = EventVisibility.PUBLIC) =>
  prisma.event.create({
    data: {
      source: EventSource.APP,
      name: "Einsatz",
      startTime: EVENT_START_TIME,
      visibility,
    },
  });

const createTaskCreatedNotification = (
  citizenId: string,
  taskId: string,
  archivedAt: Date | null = null,
) =>
  prisma.onSiteNotification.create({
    data: {
      citizenId,
      notificationType: "task_created",
      payload: { taskId, taskTitle: "Frachter eskortieren" },
      archivedAt,
    },
  });

const createEventNotification = (
  citizenId: string,
  eventId: string,
  notificationType: "event_created" | "event_updated" = "event_created",
) =>
  prisma.onSiteNotification.create({
    data: {
      citizenId,
      notificationType,
      payload: { eventId, eventName: "Einsatz" },
    },
  });

const findMarkerSubjectIds = async (citizenId: string) =>
  (
    await prisma.readMarker.findMany({
      where: { citizenId },
      select: { taskId: true, eventId: true, changelogEntryKey: true },
    })
  )
    .flatMap((marker) =>
      [marker.taskId, marker.eventId, marker.changelogEntryKey].filter(
        (subjectId) => subjectId !== null,
      ),
    )
    .toSorted();

const isRead = async (notificationId: string) =>
  (
    await prisma.onSiteNotification.findUniqueOrThrow({
      where: { id: notificationId },
    })
  ).readAt !== null;

beforeEach(async () => {
  await truncateAllTables();
});

describe("notification read → item read", () => {
  test("the read of a new task notification marks the task as read", async () => {
    const { citizen, actor } = await createReader();
    const task = await createTask();
    const notification = await createTaskCreatedNotification(
      citizen.id,
      task.id,
    );
    const { context, auditEvents } = createTestApplicationContext();

    await expect(
      markOnSiteNotificationRead(context, actor, {
        notification_id: notification.id,
      }),
    ).resolves.toEqual({
      notification_id: notification.id,
      changed: true,
      new_item_read: true,
    });

    expect(await findMarkerSubjectIds(citizen.id)).toEqual([task.id]);
    expect(auditEvents).toEqual([
      {
        type: AuditEventType.ON_SITE_NOTIFICATIONS_READ,
        data: { citizenId: citizen.id, count: 1 },
        createdById: actor.userId,
      },
      {
        type: AuditEventType.READ_MARKER_CREATED,
        data: {
          citizenId: citizen.id,
          subject: ReadMarkerSubject.Task,
          subjectId: task.id,
        },
        createdById: actor.userId,
      },
    ]);
  });

  test("mark all as read marks the announced tasks and events with one audit event, and skips invisible items and other types", async () => {
    const { citizen, actor } = await createReader();
    const task = await createTask();
    const event = await createEvent();
    const restrictedEvent = await createEvent(EventVisibility.RESTRICTED);
    const updatedEvent = await createEvent();
    await createTaskCreatedNotification(citizen.id, task.id);
    await createEventNotification(citizen.id, event.id);
    await createEventNotification(citizen.id, restrictedEvent.id);
    await createEventNotification(citizen.id, updatedEvent.id, "event_updated");
    const { context, auditEvents } = createTestApplicationContext();

    await expect(
      markAllOnSiteNotificationsRead(context, actor),
    ).resolves.toEqual({ count: 4, new_items_read: true });

    expect(await findMarkerSubjectIds(citizen.id)).toEqual(
      [task.id, event.id].toSorted(),
    );
    expect(
      auditEvents.filter(
        (auditEvent) => auditEvent.type === AuditEventType.READ_MARKERS_CREATED,
      ),
    ).toEqual([
      {
        type: AuditEventType.READ_MARKERS_CREATED,
        data: {
          citizenId: citizen.id,
          markers: expect.arrayContaining([
            { subject: ReadMarkerSubject.Task, subjectId: task.id },
            { subject: ReadMarkerSubject.Event, subjectId: event.id },
          ]),
        },
        createdById: actor.userId,
      },
    ]);
  });

  test("a notification that was read already marks nothing", async () => {
    const { citizen, actor } = await createReader();
    const task = await createTask();
    const notification = await prisma.onSiteNotification.create({
      data: {
        citizenId: citizen.id,
        notificationType: "task_created",
        payload: { taskId: task.id, taskTitle: "Frachter eskortieren" },
        readAt: TEST_NOW,
      },
    });
    const { context, auditEvents } = createTestApplicationContext();

    await expect(
      markOnSiteNotificationRead(context, actor, {
        notification_id: notification.id,
      }),
    ).resolves.toEqual({
      notification_id: notification.id,
      changed: false,
      new_item_read: false,
    });

    expect(await findMarkerSubjectIds(citizen.id)).toEqual([]);
    expect(auditEvents).toEqual([]);
  });
});

describe("item read → notification read", () => {
  test("the read of a task marks its unread notifications as read, also the archived ones, but not the notifications of other citizens", async () => {
    const { citizen, actor } = await createReader();
    const otherCitizen = await prisma.citizen.create({
      data: { handle: "other" },
    });
    const task = await createTask();
    const otherTask = await createTask();
    const notification = await createTaskCreatedNotification(
      citizen.id,
      task.id,
    );
    const archivedNotification = await createTaskCreatedNotification(
      citizen.id,
      task.id,
      TEST_NOW,
    );
    const otherTaskNotification = await createTaskCreatedNotification(
      citizen.id,
      otherTask.id,
    );
    const notificationOfOtherCitizen = await createTaskCreatedNotification(
      otherCitizen.id,
      task.id,
    );
    const { context, auditEvents } = createTestApplicationContext();

    await expect(
      markItemAsRead(context, actor, {
        subject: ReadMarkerSubject.Task,
        subject_id: task.id,
      }),
    ).resolves.toEqual({
      subject: ReadMarkerSubject.Task,
      subject_id: task.id,
      was_new: true,
      created: true,
      notifications_read: 2,
    });

    expect(await isRead(notification.id)).toBe(true);
    expect(await isRead(archivedNotification.id)).toBe(true);
    expect(await isRead(otherTaskNotification.id)).toBe(false);
    expect(await isRead(notificationOfOtherCitizen.id)).toBe(false);
    expect(auditEvents).toEqual([
      {
        type: AuditEventType.READ_MARKER_CREATED,
        data: {
          citizenId: citizen.id,
          subject: ReadMarkerSubject.Task,
          subjectId: task.id,
        },
        createdById: actor.userId,
      },
      {
        type: AuditEventType.ON_SITE_NOTIFICATIONS_READ,
        data: { citizenId: citizen.id, count: 2 },
        createdById: actor.userId,
      },
    ]);
  });

  test("a notification that arrives after the read is marked by the next read, and other types stay unread", async () => {
    const { citizen, actor } = await createReader();
    const event = await createEvent();
    const { context } = createTestApplicationContext();
    await markItemAsRead(context, actor, {
      subject: ReadMarkerSubject.Event,
      subject_id: event.id,
    });
    const notification = await createEventNotification(citizen.id, event.id);
    const updateNotification = await createEventNotification(
      citizen.id,
      event.id,
      "event_updated",
    );

    await expect(
      markItemAsRead(context, actor, {
        subject: ReadMarkerSubject.Event,
        subject_id: event.id,
      }),
    ).resolves.toMatchObject({
      was_new: false,
      created: false,
      notifications_read: 1,
    });

    expect(await isRead(notification.id)).toBe(true);
    expect(await isRead(updateNotification.id)).toBe(false);
  });
});

describe("changelog entries", () => {
  const changelog: ChangelogSource = {
    list: async () => [],
    listTrackedEntries: () => [
      // Before the confirmation day of the test actor (`TEST_NOW`)
      { key: "2026-06-14-alt", date: "2026-06-14" },
      { key: "2026-06-15-schiffe-löschen", date: "2026-06-15" },
      { key: "2026-07-01-flotte", date: "2026-07-01" },
    ],
  };

  test("only tracked entries from the confirmation day on are new, and a batch read marks only tracked entries", async () => {
    const { citizen, actor } = await createReader();
    const { context, auditEvents } = createTestApplicationContext({
      changelog,
    });

    await expect(countNewItemsBySubject(context, actor)).resolves.toEqual({
      [ReadMarkerSubject.Task]: 0,
      [ReadMarkerSubject.Event]: 0,
      [ReadMarkerSubject.ChangelogEntry]: 2,
    });

    await expect(
      markItemsAsRead(context, actor, {
        subject: ReadMarkerSubject.ChangelogEntry,
        subject_ids: [
          "2026-06-14-alt",
          "2026-06-15-schiffe-löschen",
          "not-tracked",
        ],
      }),
    ).resolves.toEqual({ new_count: 1, notifications_read: 0 });

    expect(await findMarkerSubjectIds(citizen.id)).toEqual(
      ["2026-06-14-alt", "2026-06-15-schiffe-löschen"].toSorted(),
    );
    await expect(countNewItemsBySubject(context, actor)).resolves.toEqual({
      [ReadMarkerSubject.Task]: 0,
      [ReadMarkerSubject.Event]: 0,
      [ReadMarkerSubject.ChangelogEntry]: 1,
    });
    expect(auditEvents).toEqual([
      {
        type: AuditEventType.READ_MARKERS_CREATED,
        data: {
          citizenId: citizen.id,
          markers: [
            {
              subject: ReadMarkerSubject.ChangelogEntry,
              subjectId: "2026-06-14-alt",
            },
            {
              subject: ReadMarkerSubject.ChangelogEntry,
              subjectId: "2026-06-15-schiffe-löschen",
            },
          ],
        },
        createdById: actor.userId,
      },
    ]);
  });
});
