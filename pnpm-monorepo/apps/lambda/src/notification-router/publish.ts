import { prisma } from "@sam-monorepo/database";
import { ACTIVE_CITIZEN_WHERE } from "@sam-monorepo/domain";
import { type RequestOptions } from "web-push";
import { log } from "../common/logger";
import { type Notification } from "./notification";
import { createOnSiteNotifications } from "./on-site";
import { publishOnSiteNotificationEvents } from "./soketi";
import { publishWebPushNotifications } from "./web-push";

/**
 * A deleted citizen gets no notification on any channel. This is the only
 * filter for this rule, thus the type handlers and the channels do not
 * filter deleted receivers again.
 */
const keepActiveReceivers = async (notifications: Notification[]) => {
  const activeReceivers = await prisma.citizen.findMany({
    where: {
      id: {
        in: [
          ...new Set(
            notifications.map((notification) => notification.receiverId),
          ),
        ],
      },
      ...ACTIVE_CITIZEN_WHERE,
    },
    select: { id: true },
  });
  const activeReceiverIds = new Set(
    activeReceivers.map((receiver) => receiver.id),
  );

  return notifications.filter((notification) =>
    activeReceiverIds.has(notification.receiverId),
  );
};

/**
 * Central publisher for all notification channels: persists on-site
 * notifications for every active recipient, announces them via soketi, and
 * sends web push to recipients who have not disabled it in their
 * notification settings.
 */
export const publishNotifications = async (
  notifications: Notification[],
  webPushOptions?: RequestOptions,
) => {
  if (notifications.length <= 0) return;

  const activeNotifications = await keepActiveReceivers(notifications);
  if (activeNotifications.length <= 0) return;

  const onSiteNotifications =
    await createOnSiteNotifications(activeNotifications);
  await publishOnSiteNotificationEvents(onSiteNotifications);

  try {
    await publishWebPushNotifications(activeNotifications, webPushOptions);
  } catch (error) {
    // The on-site notifications are already persisted at this point. A throw
    // would mark the SQS batch item as failed and the redelivery would
    // duplicate them, so web push failures only get logged.
    log.error("Failed to publish Web Push notifications", { error });
  }
};
