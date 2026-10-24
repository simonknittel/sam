import { prisma } from "@sam-monorepo/database";
import { AuditEventType } from "@sam-monorepo/domain";
import { beforeEach, describe, expect, test } from "vitest";
import {
  createTestApplicationContext,
  TEST_NOW,
} from "../../../test/applicationContext.js";
import {
  CLEARED_USER,
  createCitizenWithPermissions,
} from "../../../test/citizensWithPermissions.js";
import { truncateAllTables } from "../../../test/database.js";
import {
  storeOnSiteNotifications,
  type OnSiteNotificationDraft,
} from "./onSiteNotificationStore.js";

const LOGIN_PERMISSION_STRINGS = ["login;manage"];

const createDraft = (receiverId: string): OnSiteNotificationDraft => ({
  receiverId,
  notificationType: "task_assignment_updated",
  payload: { taskId: "task", taskTitle: "Test" },
});

beforeEach(async () => {
  await truncateAllTables();
});

describe("storeOnSiteNotifications", () => {
  test("writes rows only for the receivers who pass the clearance page", async () => {
    const cleared = await createCitizenWithPermissions(
      "cleared",
      LOGIN_PERMISSION_STRINGS,
      [],
      CLEARED_USER,
    );
    const receivers = await Promise.all([
      createCitizenWithPermissions("banned", LOGIN_PERMISSION_STRINGS, [], {
        user: { create: { emailVerified: TEST_NOW, bannedAt: TEST_NOW } },
      }),
      createCitizenWithPermissions(
        "without-confirmed-email",
        LOGIN_PERMISSION_STRINGS,
        [],
        { user: { create: {} } },
      ),
      createCitizenWithPermissions("without-user", LOGIN_PERMISSION_STRINGS),
      createCitizenWithPermissions(
        "negated-login",
        [...LOGIN_PERMISSION_STRINGS, "login;negate"],
        [],
        CLEARED_USER,
      ),
    ]);
    const { context, auditEvents } = createTestApplicationContext();

    const rows = await storeOnSiteNotifications(context, [
      createDraft(cleared.id),
      ...receivers.map((receiver) => createDraft(receiver.id)),
    ]);

    const onSiteNotifications = await prisma.onSiteNotification.findMany({
      select: { citizenId: true },
    });
    expect(onSiteNotifications).toEqual([{ citizenId: cleared.id }]);
    expect(rows).toEqual([expect.objectContaining({ citizenId: cleared.id })]);
    expect(auditEvents).toEqual([
      {
        type: AuditEventType.ON_SITE_NOTIFICATIONS_CREATED,
        data: { count: 1, notificationTypes: ["task_assignment_updated"] },
        createdById: null,
      },
    ]);
  });

  test("writes no row and no audit event when no receiver passes the clearance page", async () => {
    const deletedReceiver = await prisma.citizen.create({
      data: { handle: "deleted", deletedAt: TEST_NOW },
    });
    const { context, auditEvents } = createTestApplicationContext();

    const rows = await storeOnSiteNotifications(context, [
      createDraft(deletedReceiver.id),
    ]);

    expect(await prisma.onSiteNotification.count()).toBe(0);
    expect(rows).toEqual([]);
    expect(auditEvents).toEqual([]);
  });
});
