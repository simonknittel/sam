import {
  deleteEventPosition,
  deleteEventPositionInputSchema,
} from "@sam-monorepo/application";
import { defineTool } from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";
import {
  isLineupToolVisible,
  notifyingLineupPositionWriteOutputSchema,
} from "./lineupOutputSchemas.js";

export const deleteEventPositionTool = defineTool({
  name: "delete_event_position",
  group: ToolGroup.Lineup,
  title: "Delete a position from the lineup of an event",
  description:
    "Deletes a position (position id from get_event_lineup) together with its children, their assigned citizens and their applications. This cannot be undone. Needs the right to manage the positions of the event, and the event must not have ended. While the lineup is published, each assigned citizen except the user gets a notification. Gives the deleted position as it was before the deletion.",
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: false,
  },
  inputSchema: deleteEventPositionInputSchema,
  outputSchema: notifyingLineupPositionWriteOutputSchema,
  isVisible: isLineupToolVisible,
  handler: deleteEventPosition,
});
