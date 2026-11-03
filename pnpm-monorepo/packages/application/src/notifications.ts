import type { ApplicationContext, Notification } from "./context.js";

/**
 * Sends the notifications about data that a use case already saved. A
 * failure must not make the result an error: the caller would save the same
 * data again (an MCP client would call a write tool again). Thus the
 * function logs the failure and returns `false`, and the caller shows a
 * warning next to its success. An empty list sends nothing and gives `true`.
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
