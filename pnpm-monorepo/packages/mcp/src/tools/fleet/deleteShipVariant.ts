import {
  deleteVariant,
  deleteVariantInputSchema,
} from "@sam-monorepo/application";
import { defineTool } from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";
import {
  canManageShipCatalog,
  shipVariantDetailOutputSchema,
} from "./shipCatalogSchemas.js";

export const deleteShipVariantTool = defineTool({
  name: "delete_ship_variant",
  group: ToolGroup.Fleet,
  title: "Delete a ship variant",
  description:
    "Deletes a variant of the ship catalog permanently (variant_id from search_ship_variants). This also deletes all ships of the variant of all citizens, also the deleted ships, removes the variant from the required ships of the event lineups and deletes the history of its ship counts in the statistics. Nothing can be restored. Only with the permission to manage the ship catalog. Gives the deleted variant like get_ship_variant; its ship_count is the number of the deleted ships of the active citizens.",
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: false,
  },
  inputSchema: deleteVariantInputSchema,
  outputSchema: shipVariantDetailOutputSchema,
  isVisible: canManageShipCatalog,
  handler: deleteVariant,
});
