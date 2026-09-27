import { prisma } from "@sam-monorepo/database";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { truncateAllTables } from "../../test/database";
import { type Notification } from "./notification";
import { publishNotifications } from "./publish";
import { publishOnSiteNotificationEvents } from "./soketi";
import { publishWebPushNotifications } from "./web-push";

vi.mock("./soketi", () => ({ publishOnSiteNotificationEvents: vi.fn() }));
vi.mock("./web-push", () => ({ publishWebPushNotifications: vi.fn() }));

const createNotification = (receiverId: string): Notification => ({
  receiverId,
  notificationType: "task_assignment_updated",
  payload: { taskId: "task", taskTitle: "Test" },
  title: "Neuer Task",
  body: "Dir wurde ein Task zugewiesen: Test",
});

beforeEach(async () => {
  await truncateAllTables();
  vi.mocked(publishOnSiteNotificationEvents).mockClear();
  vi.mocked(publishWebPushNotifications).mockClear();
});

describe("publishNotifications", () => {
  test("sends nothing to a deleted receiver on any channel", async () => {
    const activeReceiver = await prisma.citizen.create({
      data: { handle: "active" },
    });
    const deletedReceiver = await prisma.citizen.create({
      data: { handle: "deleted", deletedAt: new Date() },
    });

    await publishNotifications([
      createNotification(activeReceiver.id),
      createNotification(deletedReceiver.id),
    ]);

    const onSiteNotifications = await prisma.onSiteNotification.findMany({
      select: { citizenId: true },
    });
    expect(onSiteNotifications).toEqual([{ citizenId: activeReceiver.id }]);
    expect(publishOnSiteNotificationEvents).toHaveBeenCalledExactlyOnceWith([
      expect.objectContaining({ citizenId: activeReceiver.id }),
    ]);
    expect(publishWebPushNotifications).toHaveBeenCalledExactlyOnceWith(
      [createNotification(activeReceiver.id)],
      undefined,
    );
  });

  test("publishes nothing when all receivers are deleted", async () => {
    const deletedReceiver = await prisma.citizen.create({
      data: { handle: "deleted", deletedAt: new Date() },
    });

    await publishNotifications([createNotification(deletedReceiver.id)]);

    expect(await prisma.onSiteNotification.count()).toBe(0);
    expect(publishOnSiteNotificationEvents).not.toHaveBeenCalled();
    expect(publishWebPushNotifications).not.toHaveBeenCalled();
  });
});
