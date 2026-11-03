import {
  assignEventPosition,
  assignEventPositionInputSchema,
} from "@sam-monorepo/application";
import { defineTool } from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";
import {
  isLineupToolVisible,
  lineupPositionSchema,
} from "./lineupOutputSchemas.js";

export const assignEventPositionTool = defineTool({
  name: "assign_event_position",
  group: ToolGroup.Lineup,
  title: "Assign a citizen to a position of an event",
  description:
    "Sets the citizen of a position (position id from get_event_lineup): a participant of the event or a citizen who applied for the position. citizen_id null removes the assigned citizen. Needs the right to manage the positions of the event, and the event must not have ended. While the lineup is published, the new and the previous citizen get a notification, but not the user. Gives the position.",
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  inputSchema: assignEventPositionInputSchema,
  outputSchema: lineupPositionSchema,
  isVisible: isLineupToolVisible,
  handler: assignEventPosition,
});
