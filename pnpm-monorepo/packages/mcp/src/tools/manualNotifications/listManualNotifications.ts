import {
  listManualNotifications,
  listManualNotificationsInputSchema,
} from "@sam-monorepo/application";
import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import {
  defineTool,
  READ_ONLY_TOOL_ANNOTATIONS,
} from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";
import { manualNotificationOutputSchema } from "./manualNotificationOutputSchema.js";

export const listManualNotificationsTool = defineTool({
  name: "list_manual_notifications",
  group: ToolGroup.ManualNotifications,
  title: "List manual notifications",
  description:
    "Gives the manual notifications that members sent with send_manual_notification (title, body, sender and the chosen receivers), the newest first. The search matches the title or the body. from and to bound the time of the sending.",
  annotations: READ_ONLY_TOOL_ANNOTATIONS,
  readAuditEventType: AuditEventType.MANUAL_NOTIFICATIONS_LISTED,
  inputSchema: listManualNotificationsInputSchema,
  outputSchema: z.strictObject({
    notifications: z.array(manualNotificationOutputSchema),
    next_cursor: z.string().nullable(),
  }),
  isVisible: (actor) => actor.authorize("manualNotification", "manage"),
  handler: async (context, actor, input) => {
    const { notifications, next_cursor } = await listManualNotifications(
      context,
      actor,
      input,
    );

    return { notifications, next_cursor };
  },
});
