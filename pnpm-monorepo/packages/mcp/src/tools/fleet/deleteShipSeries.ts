import {
  deleteSeries,
  deleteSeriesInputSchema,
} from "@sam-monorepo/application";
import { defineTool } from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";
import {
  canManageShipCatalog,
  shipSeriesOutputSchema,
} from "./shipCatalogSchemas.js";

export const deleteShipSeriesTool = defineTool({
  name: "delete_ship_series",
  group: ToolGroup.Fleet,
  title: "Delete a ship series",
  description:
    "Deletes a series of the ship catalog permanently (series_id from list_ship_manufacturers or search_ship_variants), together with its variants. This also deletes all ships of these variants of all citizens, also the deleted ships, removes the variants from the required ships of the event lineups and deletes the history of their ship counts in the statistics. Nothing can be restored. Only with the permission to manage the ship catalog. Gives the deleted series.",
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: false,
  },
  inputSchema: deleteSeriesInputSchema,
  outputSchema: shipSeriesOutputSchema,
  isVisible: canManageShipCatalog,
  handler: deleteSeries,
});
