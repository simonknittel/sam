import { expectAuditEvents } from "../fixtures/audit";
import {
  createCitizen,
  createMcpCitizen,
  createOnSiteNotification,
} from "../fixtures/factories";
import { callForContent } from "../fixtures/mcp-client";
import { expect, test } from "../fixtures/test";

const MANUAL_NOTIFICATION = {
  notificationType: "manual_notification",
  payload: { title: "Treffen", body: "Um 20 Uhr in Port Tressler." },
};

test.describe("the notification tools of the MCP server", () => {
  test("list_my_notifications gives only the unread notifications of the inbox, and the filters give the read and the archived ones", async ({
    prisma,
    authorizeMcpClient,
    connectMcpClient,
  }) => {
    const reader = await createMcpCitizen(prisma, { handle: "mcp-leserin" });
    const stranger = await createCitizen(prisma, { handle: "mcp-fremder" });
    const citizenId = reader.entity.id;
    const now = Date.now();
    const createdAt = (minutesAgo: number) =>
      new Date(now - minutesAgo * 60_000);
    const unreadInInbox = await createOnSiteNotification(prisma, {
      citizenId,
      createdAt: createdAt(1),
    });
    const readInInbox = await createOnSiteNotification(prisma, {
      citizenId,
      ...MANUAL_NOTIFICATION,
      createdAt: createdAt(2),
      readAt: createdAt(1),
    });
    const unreadInArchive = await createOnSiteNotification(prisma, {
      citizenId,
      createdAt: createdAt(3),
      archivedAt: createdAt(1),
    });
    const readInArchive = await createOnSiteNotification(prisma, {
      citizenId,
      createdAt: createdAt(4),
      readAt: createdAt(2),
      archivedAt: createdAt(1),
    });
    await createOnSiteNotification(prisma, { citizenId: stranger.entity.id });
    const client = await connectMcpClient(
      (await authorizeMcpClient(reader.user)).accessToken,
    );

    expect(await callForContent(client, "list_my_notifications")).toEqual({
      notifications: [
        {
          id: unreadInInbox.id,
          type: "event_created",
          payload: { eventId: "test-event", eventName: "Operation Testlauf" },
          created_at: unreadInInbox.createdAt.toISOString(),
          read_at: null,
          archived_at: null,
        },
      ],
      total: 1,
      next_cursor: null,
    });

    const listIds = async (filters: Record<string, unknown>) => {
      const { notifications } = (await callForContent(
        client,
        "list_my_notifications",
        filters,
      )) as { notifications: { id: string }[] };

      return notifications.map(({ id }) => id);
    };
    expect(await listIds({ read: "all" })).toEqual([
      unreadInInbox.id,
      readInInbox.id,
    ]);
    expect(await listIds({ read: "read", archived: "all" })).toEqual([
      readInInbox.id,
      readInArchive.id,
    ]);
    expect(await listIds({ read: "all", archived: "yes" })).toEqual([
      unreadInArchive.id,
      readInArchive.id,
    ]);

    const firstPage = (await callForContent(client, "list_my_notifications", {
      read: "all",
      archived: "all",
      limit: 3,
    })) as {
      notifications: { id: string }[];
      total: number;
      next_cursor: string;
    };
    expect(firstPage.total).toBe(4);
    expect(firstPage.notifications).toHaveLength(3);
    expect(
      await callForContent(client, "list_my_notifications", {
        read: "all",
        archived: "all",
        limit: 3,
        cursor: firstPage.next_cursor,
      }),
    ).toMatchObject({
      notifications: [{ id: readInArchive.id }],
      total: 4,
      next_cursor: null,
    });

    expect(
      await prisma.auditEvent.findFirstOrThrow({
        where: { type: "OWN_NOTIFICATIONS_LISTED" },
        orderBy: { createdAt: "asc" },
        select: { createdById: true, triggeredViaMcp: true, data: true },
      }),
    ).toEqual({
      createdById: reader.user.id,
      triggeredViaMcp: true,
      data: { arguments: { read: "unread", archived: "no", limit: 25 } },
    });
  });

  test("update_notification marks an own notification as read and unread and moves it to the archive and back, and a repeated call changes nothing", async ({
    prisma,
    authorizeMcpClient,
    connectMcpClient,
  }) => {
    const reader = await createMcpCitizen(prisma, { handle: "mcp-leserin" });
    const stranger = await createCitizen(prisma, { handle: "mcp-fremder" });
    const notification = await createOnSiteNotification(prisma, {
      citizenId: reader.entity.id,
      ...MANUAL_NOTIFICATION,
    });
    const strangerNotification = await createOnSiteNotification(prisma, {
      citizenId: stranger.entity.id,
    });
    const client = await connectMcpClient(
      (await authorizeMcpClient(reader.user)).accessToken,
    );
    const update = (action: string, notificationId = notification.id) =>
      callForContent(client, "update_notification", {
        notification_id: notificationId,
        action,
      });
    const findState = () =>
      prisma.onSiteNotification.findUniqueOrThrow({
        where: { id: notification.id },
        select: { readAt: true, archivedAt: true },
      });

    expect(await update("mark_read")).toEqual({
      notification_id: notification.id,
      changed: true,
      new_item_read: false,
    });
    expect(await update("mark_read")).toMatchObject({ changed: false });

    expect(await update("archive")).toMatchObject({ changed: true });
    expect(await update("archive")).toMatchObject({ changed: false });
    expect(await findState()).toEqual({
      readAt: expect.any(Date),
      archivedAt: expect.any(Date),
    });

    expect(await update("unarchive")).toMatchObject({ changed: true });
    expect(await update("unarchive")).toMatchObject({ changed: false });

    expect(await update("mark_unread")).toMatchObject({ changed: true });
    expect(await update("mark_unread")).toMatchObject({ changed: false });
    expect(await findState()).toEqual({ readAt: null, archivedAt: null });

    for (const action of ["mark_read", "archive"])
      expect(await update(action, strangerNotification.id)).toMatchObject({
        changed: false,
      });
    expect(
      await prisma.onSiteNotification.findUniqueOrThrow({
        where: { id: strangerNotification.id },
        select: { readAt: true, archivedAt: true },
      }),
    ).toEqual({ readAt: null, archivedAt: null });

    // One event for each change, none for the calls that changed nothing
    await expectAuditEvents(prisma, [
      "ON_SITE_NOTIFICATIONS_READ",
      "ON_SITE_NOTIFICATION_ARCHIVED",
      "ON_SITE_NOTIFICATION_UNARCHIVED",
      "ON_SITE_NOTIFICATION_UNREAD",
    ]);
    expect(
      await prisma.auditEvent.findMany({
        where: { type: { startsWith: "ON_SITE_NOTIFICATION" } },
        select: { triggeredViaMcp: true },
      }),
    ).toEqual(Array.from({ length: 4 }, () => ({ triggeredViaMcp: true })));
  });
});
