import {
  changeRolePermissions,
  changeRolePermissionsInputSchema,
} from "@sam-monorepo/application";
import * as z from "zod";
import { defineTool } from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";

export const changeRolePermissionsTool = defineTool({
  name: "change_role_permissions",
  group: ToolGroup.Roles,
  title: "Change the permissions of a role",
  description:
    "Adds permission strings to a role and removes permission strings from it (role_id from list_roles or get_role). The other permission strings of the role stay. Only the strings of get_permission_catalog and the rules that it describes can be added; a different string gives a ValidationError. Each string can be removed. Only with the permission to manage roles. Gives all permission strings of the role after the change and the strings that really changed.",
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  inputSchema: changeRolePermissionsInputSchema,
  outputSchema: z.strictObject({
    role_id: z.string(),
    permission_strings: z
      .array(z.string())
      .describe("All permission strings of the role after the change."),
    added: z
      .array(z.string())
      .describe("The strings of add that the role did not have before."),
    removed: z
      .array(z.string())
      .describe("The strings of remove that the role had before."),
  }),
  isVisible: (actor) => actor.authorize("role", "manage"),
  handler: changeRolePermissions,
});
