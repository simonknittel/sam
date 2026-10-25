import {
  listMyNotifications,
  listMyNotificationsInputSchema,
} from "@sam-monorepo/application";
import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { dateTimeOutputSchema } from "../../schemas.js";
import {
  defineTool,
  READ_ONLY_TOOL_ANNOTATIONS,
} from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";

export const listMyNotificationsTool = defineTool({
  name: "list_my_notifications",
  group: ToolGroup.Notifications,
  title: "List my notifications",
  description:
    "Gives the notifications of the user from the notification center of SAM, the newest first: the type, the content, and when the user read or archived them. Without filters, it gives only the unread notifications of the inbox. read and archived select the other notifications, for example read: all and archived: yes for the full archive. total is the number of the notifications that agree with the filters.",
  annotations: READ_ONLY_TOOL_ANNOTATIONS,
  readAuditEventType: AuditEventType.OWN_NOTIFICATIONS_LISTED,
  inputSchema: listMyNotificationsInputSchema,
  outputSchema: z.strictObject({
    notifications: z.array(
      z.strictObject({
        id: z.string(),
        type: z
          .string()
          .describe(
            "The type, for example event_created, task_assignment_updated or manual_notification.",
          ),
        // `z.json()` would need a cast: the use case gives the JSON column as
        // `Prisma.JsonValue`. The column holds only JSON, thus `z.unknown()`
        // is sufficient.
        payload: z
          .unknown()
          .describe(
            "The content with the keys as the app stored them, for example the id and the name of the event. Some types have a title and a body.",
          ),
        created_at: dateTimeOutputSchema,
        read_at: dateTimeOutputSchema.nullable(),
        archived_at: dateTimeOutputSchema.nullable(),
      }),
    ),
    total: z.number().int().min(0),
    next_cursor: z.string().nullable(),
  }),
  isVisible: (actor) => actor.citizen !== null,
  handler: listMyNotifications,
});
