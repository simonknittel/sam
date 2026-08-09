import { type RequestOptions } from "web-push";
import { type Notification } from "./notification";
import { createOnSiteNotifications } from "./on-site";
import { publishOnSiteNotificationEvents } from "./soketi";
import { publishWebPushNotifications } from "./web-push";

/**
 * Central publisher for all notification channels: persists on-site
 * notifications for every recipient, announces them via soketi, and sends
 * web push to recipients who enabled it in their notification settings.
 */
export const publishNotifications = async (
  notifications: Notification[],
  webPushOptions?: RequestOptions,
) => {
  if (notifications.length <= 0) return;

  const onSiteNotifications = await createOnSiteNotifications(notifications);
  await publishOnSiteNotificationEvents(onSiteNotifications);

  await publishWebPushNotifications(notifications, webPushOptions);
};
