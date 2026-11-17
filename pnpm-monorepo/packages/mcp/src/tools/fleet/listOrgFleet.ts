import {
  listOrgFleet,
  listOrgFleetInputSchema,
} from "@sam-monorepo/application";
import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import {
  defineTool,
  READ_ONLY_TOOL_ANNOTATIONS,
} from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";
import { shipVariantOutputSchema } from "./shipVariantOutputSchema.js";
import { valueOutputSchema } from "./valueOutputSchema.js";

export const listOrgFleetTool = defineTool({
  name: "list_org_fleet",
  group: ToolGroup.Fleet,
  title: "List the fleet of the organization",
  description:
    "Gives the ship variants with the number of ships that the members of the organization own (also the variants with 0 ships), and the totals of ships, of citizens with ships and of the value of the ships (store price in USD and in-game price in aUEC) for each acquisition source. Filter by flight readiness, by manufacturer ids (from search_ship_variants), by variant tag ids (from the tags in earlier results), by a part of the variant name and by the acquisition source of the ships.",
  annotations: READ_ONLY_TOOL_ANNOTATIONS,
  readAuditEventType: AuditEventType.ORGANIZATION_FLEET_LISTED,
  inputSchema: listOrgFleetInputSchema,
  outputSchema: z.strictObject({
    fleet: z.array(
      z.strictObject({
        variant: shipVariantOutputSchema,
        count: z.number().int().min(0),
      }),
    ),
    total_citizens: z.number().int().min(0),
    total_ships: z.number().int().min(0),
    value: valueOutputSchema,
    next_cursor: z.string().nullable(),
  }),
  isVisible: (actor) =>
    actor.authorize("orgFleet", "read") &&
    actor.authorize("organizationMembership", "read"),
  handler: async (context, actor, input) => {
    const { fleet, total_citizens, total_ships, value, next_cursor } =
      await listOrgFleet(context, actor, input);

    return {
      fleet,
      total_citizens,
      total_ships,
      value,
      next_cursor,
    };
  },
});
