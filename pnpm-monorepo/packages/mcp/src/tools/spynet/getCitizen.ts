import {
  getCitizen,
  getCitizenInputSchema,
  MembershipVisibility,
} from "@sam-monorepo/application";
import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { dateTimeOutputSchema } from "../../schemas.js";
import {
  defineTool,
  READ_ONLY_TOOL_ANNOTATIONS,
} from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";

export const getCitizenTool = defineTool({
  name: "get_citizen",
  group: ToolGroup.Spynet,
  title: "Get a citizen",
  description:
    "Gives the profile of a citizen by its id: the identity values, the visible roles, the current organizations, the current penalty points and the number of ships. A value that the user cannot read is null (the lists are empty). The handle is only display text; use the ids in other tools. Every user can read the own citizen (see get_user); without access to the Spynet, only the handle, the time zone, the roles, the penalty points and the number of ships.",
  annotations: READ_ONLY_TOOL_ANNOTATIONS,
  readAuditEventType: AuditEventType.CITIZEN_READ,
  inputSchema: getCitizenInputSchema,
  outputSchema: z.strictObject({
    id: z.string(),
    handle: z.string().nullable(),
    spectrum_id: z.string().nullable(),
    community_moniker: z.string().nullable(),
    citizen_record: z.string().nullable(),
    timezone: z.string().nullable(),
    created_at: dateTimeOutputSchema.nullable(),
    discord_id: z.string().nullable(),
    teamspeak_id: z.string().nullable(),
    last_seen_at: dateTimeOutputSchema.nullable(),
    roles: z.array(z.strictObject({ id: z.string(), name: z.string() })),
    organization_memberships: z.array(
      z.strictObject({
        organization: z.strictObject({
          id: z.string(),
          name: z.string(),
          logo_url: z.url().nullable(),
        }),
        visibility: z.enum(MembershipVisibility),
      }),
    ),
    penalty_points: z.int().nullable(),
    ship_count: z.int().min(0).nullable(),
  }),
  isVisible: (actor) =>
    actor.authorize("citizen", "read") || actor.citizen !== null,
  handler: getCitizen,
});
