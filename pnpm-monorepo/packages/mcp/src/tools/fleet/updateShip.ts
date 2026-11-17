import { updateShip, updateShipInputSchema } from "@sam-monorepo/application";
import { defineTool } from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";
import { shipOutputSchema } from "./shipOutputSchema.js";

export const updateShipTool = defineTool({
  name: "update_ship",
  group: ToolGroup.Fleet,
  title: "Update a ship",
  description:
    "Changes the name, the acquisition source or the note of a ship of the signed-in user (ship_id from list_my_ships). An absent field stays. Gives the ship in the format of list_my_ships.",
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  inputSchema: updateShipInputSchema,
  outputSchema: shipOutputSchema,
  isVisible: (actor) =>
    actor.authorize("ship", "manage") && actor.citizen !== null,
  handler: updateShip,
});
