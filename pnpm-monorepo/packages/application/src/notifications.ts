import type { ApplicationContext, Notification } from "./context.js";

/**
 * Sends the notifications about data that a use case already saved. A
 * failure must not make the result an error: the caller would save the same
 * data again (an MCP client would call a write tool again). Thus the
 * function logs the failure and returns `false`. An empty list sends nothing
 * and gives `true`.
 *
 * The Next.js app sends the notifications after its response, thus the
 * outputs of the use cases do not report the result. Only an automation that
 * tries again after a failure uses it.
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
