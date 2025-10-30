import { createId } from "@paralleldrive/cuid2";
import { emitEvents } from "./eventbridge";

interface Notification {
  type: string;
  payload: any;
}

export const triggerNotifications = async (notifications: Notification[]) => {
  await emitEvents(
    notifications.map((notification) => ({
      Source: "scrape-discord-events",
      DetailType: "NotificationRequested",
      Detail: JSON.stringify({
        type: notification.type,
        payload: notification.payload,
        requestId: createId(),
      }),
    })),
  );
};
