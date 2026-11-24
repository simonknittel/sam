import type { ApplicationContext, Notification } from "./context.js";

/**
 * Logs a failure and gives `false`: an error would make the caller save the
 * same data again (an MCP client would call a write tool again). Only the
 * automations use the result: for their outputs, or to try again after a
 * failure.
 */
export const triggerNotificationsAfterSave = async (
  context: ApplicationContext,
  notifications: Notification[],
): Promise<boolean> => {
  if (notifications.length <= 0) return true;

  try {
    await context.notifications.trigger(notifications);
    return true;
  } catch (error) {
    context.log.error("Failed to trigger notifications after a save", {
      types: notifications.map((notification) => notification.type),
      error,
    });
    return false;
  }
};
