import { deleteEvent, deleteEventInputSchema } from "@sam-monorepo/application";
import * as z from "zod";
import { defineTool } from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";
import { isEventWriteToolVisible } from "./eventOutputSchema.js";

export const deleteEventTool = defineTool({
  name: "delete_event",
  group: ToolGroup.Events,
  title: "Delete an event",
  description:
    "Deletes an event of SAM (event_id from list_events, source app) that has not ended, and notifies its participants. Needs can_manage. The event disappears for all users. An event that is published on Discord can only be deleted in the SAM web app, which also removes the Discord event. Gives the id of the deleted event.",
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: false,
  },
  inputSchema: deleteEventInputSchema,
  outputSchema: z.strictObject({
    event_id: z.string(),
  }),
  isVisible: isEventWriteToolVisible,
  // Without the Discord option: the MCP server cannot reach Discord
  handler: (context, actor, input) => deleteEvent(context, actor, input),
});
