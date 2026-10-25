import { listMyShips, listMyShipsInputSchema } from "@sam-monorepo/application";
import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import {
  defineTool,
  READ_ONLY_TOOL_ANNOTATIONS,
} from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";
import { shipOutputSchema } from "./shipOutputSchema.js";

export const listMyShipsTool = defineTool({
  name: "list_my_ships",
  group: ToolGroup.Fleet,
  title: "List my ships",
  description:
    "Gives the ships of the citizen of the signed-in user with their variants, sorted by the variant name; the list is empty for a user without a citizen. Filter like list_org_fleet; deleted: true gives only the deleted ships.",
  annotations: READ_ONLY_TOOL_ANNOTATIONS,
  readAuditEventType: AuditEventType.OWN_SHIPS_LISTED,
  inputSchema: listMyShipsInputSchema,
  outputSchema: z.strictObject({
    ships: z.array(shipOutputSchema),
    total: z.number().int().min(0),
    next_cursor: z.string().nullable(),
  }),
  isVisible: (actor) => actor.authorize("ship", "manage"),
  handler: async (context, actor, input) => {
    const { ships, total, next_cursor } = await listMyShips(
      context,
      actor,
      input,
    );

    return { ships, total, next_cursor };
  },
});
