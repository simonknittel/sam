import {
  updateSeries,
  updateSeriesInputSchema,
} from "@sam-monorepo/application";
import { defineTool } from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";
import {
  canManageShipCatalog,
  shipSeriesOutputSchema,
} from "./shipCatalogSchemas.js";

export const updateShipSeriesTool = defineTool({
  name: "update_ship_series",
  group: ToolGroup.Fleet,
  title: "Rename a ship series",
  description:
    "Changes the name of a series of the ship catalog (series_id from list_ship_manufacturers or search_ship_variants). A name that a different series of any manufacturer has gives a ValidationError. Only with the permission to manage the ship catalog. Gives the series.",
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  inputSchema: updateSeriesInputSchema,
  outputSchema: shipSeriesOutputSchema,
  isVisible: canManageShipCatalog,
  handler: updateSeries,
});
