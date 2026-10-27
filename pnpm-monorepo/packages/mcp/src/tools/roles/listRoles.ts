import {
  canSeeAnyRole,
  listRoles,
  listRolesInputSchema,
} from "@sam-monorepo/application";
import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import {
  defineTool,
  READ_ONLY_TOOL_ANNOTATIONS,
} from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";
import { roleOutputShape } from "./roleOutputSchema.js";

export const listRolesTool = defineTool({
  name: "list_roles",
  group: ToolGroup.Roles,
  title: "List the roles",
  description:
    "Gives the roles that the user can see, sorted by name: the id, the name, the description as Markdown, the icon URL, the number of levels, the ids of the inherited roles and the tags (id and name). tag_id (from list_role_tags) gives only the roles with one tag. Use the role ids with get_role or as the role filter of list_citizens.",
  annotations: READ_ONLY_TOOL_ANNOTATIONS,
  readAuditEventType: AuditEventType.ROLES_LISTED,
  inputSchema: listRolesInputSchema,
  outputSchema: z.strictObject({
    roles: z.array(z.strictObject(roleOutputShape)),
    next_cursor: z.string().nullable(),
  }),
  isVisible: canSeeAnyRole,
  handler: listRoles,
});
