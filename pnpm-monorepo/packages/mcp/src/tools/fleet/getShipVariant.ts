import {
  getShipVariant,
  getShipVariantInputSchema,
} from "@sam-monorepo/application";
import { AuditEventType } from "@sam-monorepo/domain";
import {
  defineTool,
  READ_ONLY_TOOL_ANNOTATIONS,
} from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";
import {
  canManageShipCatalog,
  shipVariantDetailOutputSchema,
} from "./shipCatalogSchemas.js";

export const getShipVariantTool = defineTool({
  name: "get_ship_variant",
  group: ToolGroup.Fleet,
  title: "Get a ship variant",
  description:
    "Gives one variant of the ship catalog (variant_id from search_ship_variants) like search_ship_variants, and also its links to external websites, the wiki page that the variant page embeds and the number of ships that the active citizens own. Only with the permission to manage the ship catalog. Use it before update_ship_variant to get the current tags and links.",
  annotations: READ_ONLY_TOOL_ANNOTATIONS,
  readAuditEventType: AuditEventType.SHIP_VARIANT_READ,
  inputSchema: getShipVariantInputSchema,
  outputSchema: shipVariantDetailOutputSchema,
  isVisible: canManageShipCatalog,
  handler: getShipVariant,
});
