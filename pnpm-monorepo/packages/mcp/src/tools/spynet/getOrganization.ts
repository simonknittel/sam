import {
  getOrganization,
  getOrganizationInputSchema,
  MembershipVisibility,
} from "@sam-monorepo/application";
import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { citizenReferenceSchema } from "../../schemas.js";
import {
  defineTool,
  READ_ONLY_TOOL_ANNOTATIONS,
} from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";

export const getOrganizationTool = defineTool({
  name: "get_organization",
  group: ToolGroup.Spynet,
  title: "Get an organization",
  description:
    "Gives a Star Citizen organization of the Spynet by its id, with its current members. The members are empty without the permission to read memberships. Each member has a citizen id for get_citizen; the handle is only display text.",
  annotations: READ_ONLY_TOOL_ANNOTATIONS,
  readAuditEventType: AuditEventType.ORGANIZATION_READ,
  inputSchema: getOrganizationInputSchema,
  outputSchema: z.strictObject({
    id: z.string(),
    name: z.string(),
    spectrum_id: z.string(),
    logo_url: z.url().nullable(),
    memberships: z.array(
      z.strictObject({
        citizen: citizenReferenceSchema,
        visibility: z.enum(MembershipVisibility),
      }),
    ),
  }),
  isVisible: (actor) => actor.authorize("organization", "read"),
  handler: getOrganization,
});
