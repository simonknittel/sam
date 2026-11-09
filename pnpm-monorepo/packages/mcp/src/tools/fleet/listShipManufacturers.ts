import {
  canSearchShipVariants,
  listShipManufacturers,
  listShipManufacturersInputSchema,
} from "@sam-monorepo/application";
import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import {
  defineTool,
  READ_ONLY_TOOL_ANNOTATIONS,
} from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";
import { manufacturerLogoOutputSchema } from "./shipVariantOutputSchema.js";

export const listShipManufacturersTool = defineTool({
  name: "list_ship_manufacturers",
  group: ToolGroup.Fleet,
  title: "List the ship manufacturers",
  description:
    "Gives the manufacturers of the ship catalog with their series, sorted by name. A series groups the variants of a manufacturer; search_ship_variants finds the variants. Use it to get the manufacturer ids and the series ids, also of the manufacturers and the series without variants.",
  annotations: READ_ONLY_TOOL_ANNOTATIONS,
  readAuditEventType: AuditEventType.SHIP_MANUFACTURERS_LISTED,
  inputSchema: listShipManufacturersInputSchema,
  outputSchema: z.strictObject({
    manufacturers: z.array(
      z.strictObject({
        id: z.string(),
        name: z.string(),
        logo: manufacturerLogoOutputSchema,
        series: z.array(z.strictObject({ id: z.string(), name: z.string() })),
      }),
    ),
    next_cursor: z.string().nullable(),
  }),
  isVisible: canSearchShipVariants,
  handler: listShipManufacturers,
});
