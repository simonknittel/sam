import { emitEvents } from "@/modules/eventbridge/utils";
import { log } from "@/modules/logging";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { createId } from "@paralleldrive/cuid2";
import { emailConfirmationHandler } from "./type-handlers/email_confirmation";

interface Notification {
  type: string;
  payload: unknown;
}

export const triggerNotifications = withTrace(
  "triggerNotifications",
  async (notifications: Notification[] = []) => {
    if (notifications[0]?.type === "EmailConfirmation") {
      // TODO: Migrate to "NotificationRequested" event type handler
      await emailConfirmationHandler(
        notifications[0].payload as Parameters<
          typeof emailConfirmationHandler
        >[0],
      );
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

/**
 * Sends the notifications about data that an action already saved. A failure
 * must not make the response an error, because the user then saves the same
 * data again. Thus the function logs the failure and returns `false`, and the
 * action shows a warning next to its success message.
 */
export const triggerNotificationsAfterSave = async (
  notifications: Notification[],
) => {
  try {
    await triggerNotifications(notifications);
    return true;
  } catch (error) {
    log.error("Failed to trigger notifications after a save", {
      types: notifications.map((notification) => notification.type),
      error,
    });
    return false;
  }
};
