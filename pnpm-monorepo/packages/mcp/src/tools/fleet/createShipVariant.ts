import {
  createVariant,
  createVariantInputSchema,
} from "@sam-monorepo/application";
import { defineTool } from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";
import {
  canManageShipCatalog,
  shipVariantDetailOutputSchema,
  shipVariantStatusInputShape,
  toVariantStatusInput,
} from "./shipCatalogSchemas.js";

export const createShipVariantTool = defineTool({
  name: "create_ship_variant",
  group: ToolGroup.Fleet,
  title: "Create a ship variant",
  description:
    'Adds a variant (a ship model, for example "Cutlass Black") to a series of the ship catalog (series_id from list_ship_manufacturers), optionally with the flight readiness, tags, links to external websites and a wiki page that the variant page embeds. The variants of one series have different names; a name that a different variant of the series has gives a ValidationError. Only with the permission to manage the ship catalog. Gives the new variant like get_ship_variant.',
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  inputSchema: createVariantInputSchema.extend(shipVariantStatusInputShape),
  outputSchema: shipVariantDetailOutputSchema,
  isVisible: (actor) => canManageShipCatalog(actor) && actor.citizen !== null,
  handler: (context, actor, { status, ...input }) =>
    createVariant(context, actor, {
      ...input,
      status: toVariantStatusInput(status),
    }),
});
