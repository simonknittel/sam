import {
  createManufacturer,
  createManufacturerInputSchema,
} from "@sam-monorepo/application";
import { defineTool } from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";
import {
  canManageShipCatalog,
  shipManufacturerOutputSchema,
} from "./shipCatalogSchemas.js";

export const createShipManufacturerTool = defineTool({
  name: "create_ship_manufacturer",
  group: ToolGroup.Fleet,
  title: "Create a ship manufacturer",
  description:
    "Adds a manufacturer to the ship catalog. Each manufacturer has a different name; a name that a different manufacturer has gives a ValidationError. The logo can only be set in the SAM web app. Only with the permission to manage the ship catalog. Gives the id and the name of the new manufacturer.",
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  inputSchema: createManufacturerInputSchema,
  outputSchema: shipManufacturerOutputSchema,
  isVisible: canManageShipCatalog,
  handler: createManufacturer,
});
