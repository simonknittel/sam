import {
  createManualNotification,
  createManualNotificationInputSchema,
} from "@sam-monorepo/application";
import * as z from "zod";
import { notificationsSentSchema } from "../../schemas.js";
import { defineTool } from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";
import { manualNotificationOutputSchema } from "./manualNotificationOutputSchema.js";

export const sendManualNotificationTool = defineTool({
  name: "send_manual_notification",
  group: ToolGroup.ManualNotifications,
  title: "Send a manual notification",
  description:
    "Sends a notification with its own title and body to the chosen citizens (citizen ids from a Spynet tool) and to the members of the chosen roles (role ids from list_roles). A role includes the citizens who have it through their effective roles, also through an inherited role. Only the citizens who can log in to SAM receive the notification. It is delivered on-site and by web push, like every notification of the SAM web app. Gives the sent notification with the chosen receivers.",
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  inputSchema: createManualNotificationInputSchema,
  outputSchema: z.strictObject({
    notification: manualNotificationOutputSchema,
    notifications_sent: notificationsSentSchema,
  }),
  isVisible: (actor) =>
    actor.authorize("manualNotification", "manage") && actor.citizen !== null,
  handler: createManualNotification,
});
