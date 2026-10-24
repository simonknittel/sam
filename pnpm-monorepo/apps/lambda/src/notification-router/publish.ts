import {
  storeOnSiteNotifications,
  type ApplicationContext,
} from "@sam-monorepo/application";
import { type RequestOptions } from "web-push";
import { log } from "../common/logger";
import { type Notification } from "./notification";
import { publishOnSiteNotificationEvents } from "./soketi";
import { publishWebPushNotifications } from "./web-push";

/**
 * Sends the notifications on all channels. It writes the on-site
 * notifications of the cleared receivers (`storeOnSiteNotifications()` leaves
 * out the other receivers) and announces them through Soketi. Then it sends
 * web push to the same receivers, if their notification settings allow it.
 */
export const publishNotifications = async (
  context: ApplicationContext,
  notifications: Notification[],
  webPushOptions?: RequestOptions,
) => {
  if (notifications.length <= 0) return;

  const rows = await storeOnSiteNotifications(context, notifications);
  if (rows.length <= 0) return;

  const clearedReceiverIds = new Set(rows.map((row) => row.citizenId));

  await publishOnSiteNotificationEvents(rows);

  try {
    await publishWebPushNotifications(
      context,
      notifications.filter((notification) =>
        clearedReceiverIds.has(notification.receiverId),
      ),
      webPushOptions,
    );
  } catch (error) {
    // The on-site notifications are already persisted at this point. A throw
    // would mark the SQS batch item as failed and the redelivery would
    // duplicate them, so web push failures only get logged.
    log.error("Failed to publish Web Push notifications", { error });
  }
};
