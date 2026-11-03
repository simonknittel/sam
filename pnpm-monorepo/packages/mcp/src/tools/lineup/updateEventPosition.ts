import {
  updateEventPosition,
  updateEventPositionInputSchema,
} from "@sam-monorepo/application";
import { defineTool } from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";
import {
  isLineupToolVisible,
  lineupPositionSchema,
} from "./lineupOutputSchemas.js";

export const updateEventPositionTool = defineTool({
  name: "update_event_position",
  group: ToolGroup.Lineup,
  title: "Update a position in the lineup of an event",
  description:
    "Changes the name, the description, the required ship variants, the required roles or the format of a position (position id from get_event_lineup). A field that is not given keeps its value; required_variant_ids replaces all required variants, required_role_ids replaces the required roles that the user can see. Needs the right to manage the positions of the event, and the event must not have ended. Gives the changed position with its children.",
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  inputSchema: updateEventPositionInputSchema,
  outputSchema: lineupPositionSchema,
  isVisible: isLineupToolVisible,
  handler: updateEventPosition,
});
