import { type RequestOptions } from "web-push";
import { log } from "../common/logger";
import { type Notification } from "./notification";
import { createOnSiteNotifications } from "./on-site";
import { publishOnSiteNotificationEvents } from "./soketi";
import { publishWebPushNotifications } from "./web-push";

/**
 * Central publisher for all notification channels: persists on-site
 * notifications for every recipient, announces them via soketi, and sends
 * web push to recipients who have not disabled it in their notification
 * settings.
 */
export const publishNotifications = async (
  notifications: Notification[],
  webPushOptions?: RequestOptions,
) => {
  if (notifications.length <= 0) return;

  const onSiteNotifications = await createOnSiteNotifications(notifications);
  await publishOnSiteNotificationEvents(onSiteNotifications);

  try {
    await publishWebPushNotifications(notifications, webPushOptions);
  } catch (error) {
    // The on-site notifications are already persisted at this point. A throw
    // would mark the SQS batch item as failed and the redelivery would
    // duplicate them, so web push failures only get logged.
    log.error("Failed to publish Web Push notifications", { error });
  }
};
