import { createShip, createShipInputSchema } from "@sam-monorepo/application";
import { defineTool } from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";
import { shipOutputSchema } from "./shipOutputSchema.js";

export const createShipTool = defineTool({
  name: "create_ship",
  group: ToolGroup.Fleet,
  title: "Add a ship",
  description:
    "Adds a ship of a variant (variant_id from search_ship_variants) to the fleet of the citizen of the signed-in user, with its acquisition source and an optional name and note. Gives the new ship in the format of list_my_ships.",
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  inputSchema: createShipInputSchema,
  outputSchema: shipOutputSchema,
  isVisible: (actor) =>
    actor.authorize("ship", "manage") && actor.citizen !== null,
  handler: createShip,
});
