import {
  archiveOnSiteNotification,
  markOnSiteNotificationRead,
  markOnSiteNotificationReadInputSchema,
  markOnSiteNotificationUnread,
  unarchiveOnSiteNotification,
} from "@sam-monorepo/application";
import * as z from "zod";
import { defineTool } from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";

export enum NotificationAction {
  MarkRead = "mark_read",
  MarkUnread = "mark_unread",
  Archive = "archive",
  Unarchive = "unarchive",
}

export const updateNotificationTool = defineTool({
  name: "update_notification",
  group: ToolGroup.Notifications,
  title: "Update a notification",
  description:
    "Changes the state of one notification of the user (notification_id from list_my_notifications). mark_read and mark_unread change the read state. archive moves the notification from the inbox to the archive, unarchive moves it back. The archive actions do not change the read state. mark_read also marks the new event or task that the notification announced as read. A repeated call changes nothing.",
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  // The four use cases have the same input
  inputSchema: markOnSiteNotificationReadInputSchema.extend({
    action: z.enum(NotificationAction),
  }),
  outputSchema: z.strictObject({
    notification_id: z.string(),
    changed: z
      .boolean()
      .describe(
        "False when nothing changed: the notification has this state already, or no notification of the user has this id.",
      ),
    new_item_read: z
      .boolean()
      .describe(
        "True when mark_read also marked the announced event or task as read. Always false for the other actions.",
      ),
  }),
  isVisible: (actor) => actor.citizen !== null,
  handler: async (context, actor, { action, notification_id }) => {
    switch (action) {
      case NotificationAction.MarkRead:
        return markOnSiteNotificationRead(context, actor, { notification_id });

      case NotificationAction.MarkUnread:
        return {
          ...(await markOnSiteNotificationUnread(context, actor, {
            notification_id,
          })),
          new_item_read: false,
        };

      case NotificationAction.Archive:
        return {
          ...(await archiveOnSiteNotification(context, actor, {
            notification_id,
          })),
          new_item_read: false,
        };

      case NotificationAction.Unarchive:
        return {
          ...(await unarchiveOnSiteNotification(context, actor, {
            notification_id,
          })),
          new_item_read: false,
        };

      default:
        throw new Error(
          `Unknown notification action: ${action satisfies never}`,
        );
    }
  },
});
