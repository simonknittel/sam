import {
  EventChange,
  updateEvent,
  updateEventInputSchema,
} from "@sam-monorepo/application";
import * as z from "zod";
import { notificationsSentSchema } from "../../schemas.js";
import { defineTool } from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";
import {
  eventOutputSchema,
  isEventWriteToolVisible,
} from "./eventOutputSchema.js";

export const updateEventTool = defineTool({
  name: "update_event",
  group: ToolGroup.Events,
  title: "Update an event",
  description:
    "Changes an event (event_id from list_events) that has not ended. Give only the fields to change. The name, the description, the start, the end and the visibility need can_manage and an event of SAM (source app); lineup_enabled needs can_manage_positions and also works for a Discord event, but not while participation_enabled is false. participation_enabled needs can_manage, can_manage_positions and an event of SAM; false cancels all sign-ups (each participant gets a notification) and removes the assigned citizens and the applications of the lineup, true restores nothing. Participants get a notification when the name, the description or the schedule changes, and when the lineup becomes visible. The name, the description and the schedule of an event that is published on Discord can only change in the SAM web app, and only there can such an event become restricted. Gives the event like get_event and the changes (empty when the event already had the values).",
  annotations: {
    readOnlyHint: false,
    // participation_enabled false cancels all sign-ups
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: false,
  },
  inputSchema: updateEventInputSchema,
  outputSchema: z.strictObject({
    event: eventOutputSchema,
    changes: z.array(z.enum(EventChange)),
    notifications_sent: notificationsSentSchema,
  }),
  isVisible: isEventWriteToolVisible,
  // Without the Discord option: the MCP server cannot reach Discord
  handler: (context, actor, input) => updateEvent(context, actor, input),
});
