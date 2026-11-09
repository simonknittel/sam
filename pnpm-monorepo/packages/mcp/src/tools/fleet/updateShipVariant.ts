import {
  updateVariant,
  updateVariantInputSchema,
} from "@sam-monorepo/application";
import { defineTool } from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";
import {
  canManageShipCatalog,
  shipVariantDetailOutputSchema,
  shipVariantStatusInputShape,
  toVariantStatusInput,
} from "./shipCatalogSchemas.js";

export const updateShipVariantTool = defineTool({
  name: "update_ship_variant",
  group: ToolGroup.Fleet,
  title: "Update a ship variant",
  description:
    "Changes a variant of the ship catalog (variant_id from search_ship_variants). The fields that are not given stay. tags and links replace all tags or all links of the variant: to add one, give the current ones from get_ship_variant and the new one. A name that a different variant of the series has gives a ValidationError. Only with the permission to manage the ship catalog. Gives the variant like get_ship_variant.",
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  inputSchema: updateVariantInputSchema.extend(shipVariantStatusInputShape),
  outputSchema: shipVariantDetailOutputSchema,
  isVisible: (actor) => canManageShipCatalog(actor) && actor.citizen !== null,
  handler: (context, actor, { status, ...input }) =>
    updateVariant(context, actor, {
      ...input,
      status: toVariantStatusInput(status),
    }),
});
