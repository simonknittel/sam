import {
  canSeeAnyRole,
  getRole,
  getRoleInputSchema,
} from "@sam-monorepo/application";
import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import {
  defineTool,
  READ_ONLY_TOOL_ANNOTATIONS,
} from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";
import { roleOutputShape } from "./roleOutputSchema.js";

export const getRoleTool = defineTool({
  name: "get_role",
  group: ToolGroup.Roles,
  title: "Get a role",
  description:
    "Gives one role by its id (from list_roles or get_citizen): the fields of list_roles and, only with the permission to manage roles, the inactivity rules and the permission strings. A role that the user cannot see gives a NotFoundError.",
  annotations: READ_ONLY_TOOL_ANNOTATIONS,
  readAuditEventType: AuditEventType.ROLE_READ,
  inputSchema: getRoleInputSchema,
  outputSchema: z.strictObject({
    ...roleOutputShape,
    max_age_days: z
      .int()
      .nullable()
      .describe(
        "The number of days of inactivity after which a citizen loses the role, or null. Null without the permission to manage roles.",
      ),
    assign_after_inactive_days: z
      .int()
      .nullable()
      .describe(
        "The number of days of inactivity after which a citizen gets the role automatically, or null. Null without the permission to manage roles.",
      ),
    permission_strings: z
      .array(z.string())
      .nullable()
      .describe(
        "The permissions that the role gives, for example otherRole;read;roleId=<role id>. Null without the permission to manage roles.",
      ),
  }),
  isVisible: canSeeAnyRole,
  handler: getRole,
});
