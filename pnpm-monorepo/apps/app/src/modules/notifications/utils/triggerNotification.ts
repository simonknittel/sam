import { emitEvents } from "@/modules/eventbridge/utils";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { createId } from "@paralleldrive/cuid2";
import { emailConfirmationHandler } from "./type-handlers/email_confirmation";

interface Notification {
  type: string;
  payload: any;
}

export const triggerNotifications = withTrace(
  "triggerNotifications",
  async (notifications: Notification[] = []) => {
    if (notifications[0]?.type === "EmailConfirmation") {
      // TODO: Migrate to "NotificationRequested" event type handler
      await emailConfirmationHandler(notifications[0].payload);
    } else {
      await emitEvents(
        notifications.map((notification) => ({
          Source: "App",
          DetailType: "NotificationRequested",
          Detail: JSON.stringify({
            type: notification.type,
            payload: notification.payload,
            requestId: createId(),
          }),
        })),
      );
    }
  },
);
