import {
  updateManufacturer,
  updateManufacturerInputSchema,
} from "@sam-monorepo/application";
import { defineTool } from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";
import {
  canManageShipCatalog,
  shipManufacturerOutputSchema,
} from "./shipCatalogSchemas.js";

export const updateShipManufacturerTool = defineTool({
  name: "update_ship_manufacturer",
  group: ToolGroup.Fleet,
  title: "Rename a ship manufacturer",
  description:
    "Changes the name of a manufacturer of the ship catalog (manufacturer_id from list_ship_manufacturers). A name that a different manufacturer has gives a ValidationError. The logo can only be changed in the SAM web app. Only with the permission to manage the ship catalog. Gives the id and the name of the manufacturer.",
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  inputSchema: updateManufacturerInputSchema,
  outputSchema: shipManufacturerOutputSchema,
  isVisible: canManageShipCatalog,
  handler: updateManufacturer,
});
