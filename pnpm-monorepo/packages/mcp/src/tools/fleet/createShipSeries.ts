import {
  createSeries,
  createSeriesInputSchema,
} from "@sam-monorepo/application";
import { defineTool } from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";
import {
  canManageShipCatalog,
  shipSeriesOutputSchema,
} from "./shipCatalogSchemas.js";

export const createShipSeriesTool = defineTool({
  name: "create_ship_series",
  group: ToolGroup.Fleet,
  title: "Create a ship series",
  description:
    'Adds a series to a manufacturer of the ship catalog (manufacturer_id from list_ship_manufacturers). A series groups the variants of one ship, for example the series "Cutlass" has the variants "Cutlass Black" and "Cutlass Red". Each series has a different name, also over all manufacturers; a name that a different series has gives a ValidationError. Only with the permission to manage the ship catalog. Gives the new series.',
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  inputSchema: createSeriesInputSchema,
  outputSchema: shipSeriesOutputSchema,
  isVisible: canManageShipCatalog,
  handler: createSeries,
});
