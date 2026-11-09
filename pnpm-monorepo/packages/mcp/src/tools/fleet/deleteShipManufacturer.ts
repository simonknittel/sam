import {
  deleteManufacturer,
  deleteManufacturerInputSchema,
} from "@sam-monorepo/application";
import { defineTool } from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";
import {
  canManageShipCatalog,
  shipManufacturerOutputSchema,
} from "./shipCatalogSchemas.js";

export const deleteShipManufacturerTool = defineTool({
  name: "delete_ship_manufacturer",
  group: ToolGroup.Fleet,
  title: "Delete a ship manufacturer",
  description:
    "Deletes a manufacturer of the ship catalog permanently (manufacturer_id from list_ship_manufacturers), together with all its series and their variants. This also deletes all ships of these variants of all citizens, also the deleted ships, removes the variants from the required ships of the event lineups and deletes the history of their ship counts in the statistics. Nothing can be restored. Only with the permission to manage the ship catalog. Gives the id and the name of the deleted manufacturer.",
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: false,
  },
  inputSchema: deleteManufacturerInputSchema,
  outputSchema: shipManufacturerOutputSchema,
  isVisible: canManageShipCatalog,
  handler: deleteManufacturer,
});
