import { prisma, type OnSiteNotification } from "@sam-monorepo/database";
import { AuditEventType } from "@sam-monorepo/domain";
import { ON_SITE_NOTIFICATION_PAYLOAD_VERSIONS } from "@sam-monorepo/notifications";
import { createAuditEvents } from "../common/audit";
import { log } from "../common/logger";
import { type Notification } from "./notification";

/**
 * Persists one `OnSiteNotification` row per notification. On-site is
 * always-on, so this happens for every recipient, before any
 * `NotificationSetting` filtering is applied for other channels.
 */
export const createOnSiteNotifications = async (
  notifications: Notification[],
): Promise<OnSiteNotification[]> => {
  if (notifications.length <= 0) return [];

  const rows = await prisma.onSiteNotification.createManyAndReturn({
    data: notifications.map((notification) => ({
      citizenId: notification.receiverId,
      notificationType: notification.notificationType,
      payload: notification.payload,
      payloadVersion:
        ON_SITE_NOTIFICATION_PAYLOAD_VERSIONS[notification.notificationType],
    })),
  });

  log.info("Created on-site notifications", { count: rows.length });

  await createAuditEvents([
    {
      type: AuditEventType.ON_SITE_NOTIFICATIONS_CREATED,
      data: {
        count: rows.length,
        notificationTypes: [
          ...new Set(rows.map((row) => row.notificationType)),
        ],
      },
    },
  ]);

  return rows;
};
