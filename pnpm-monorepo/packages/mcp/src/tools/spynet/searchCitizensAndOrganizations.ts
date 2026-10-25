import {
  searchCitizensAndOrganizations,
  searchCitizensAndOrganizationsInputSchema,
} from "@sam-monorepo/application";
import { AuditEventType, SpynetSearchHitType } from "@sam-monorepo/domain";
import * as z from "zod";
import {
  defineTool,
  READ_ONLY_TOOL_ANNOTATIONS,
} from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";

export const searchCitizensAndOrganizationsTool = defineTool({
  name: "search_citizens_and_organizations",
  group: ToolGroup.Spynet,
  title: "Search citizens and organizations",
  description:
    "Searches the citizens (by handle, community moniker, citizen record and Spectrum ID) and the organizations (by name and Spectrum ID) of the Spynet, with the best matches first. Use it to find the id of a citizen or an organization: give the id, not the handle, to the other tools. A handle is only display text.",
  annotations: READ_ONLY_TOOL_ANNOTATIONS,
  readAuditEventType: AuditEventType.CITIZENS_AND_ORGANIZATIONS_SEARCHED,
  inputSchema: searchCitizensAndOrganizationsInputSchema,
  outputSchema: z.strictObject({
    hits: z.array(
      z.discriminatedUnion("type", [
        z.strictObject({
          type: z.literal(SpynetSearchHitType.Citizen),
          id: z.string(),
          handle: z.string().nullable(),
          community_moniker: z.string().nullable(),
          citizen_record: z.string().nullable(),
          spectrum_id: z.string().nullable(),
        }),
        z.strictObject({
          type: z.literal(SpynetSearchHitType.Organization),
          id: z.string(),
          name: z.string(),
          spectrum_id: z.string(),
        }),
      ]),
    ),
  }),
  isVisible: (actor) =>
    actor.authorize("citizen", "read") ||
    actor.authorize("organization", "read"),
  handler: searchCitizensAndOrganizations,
});
