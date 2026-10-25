import {
  getPermissionCatalog,
  getPermissionCatalogInputSchema,
} from "@sam-monorepo/application";
import {
  NOTE_RULE_OPERATIONS,
  ROLE_RULE_OPERATIONS,
} from "@sam-monorepo/domain";
import * as z from "zod";
import {
  defineTool,
  READ_ONLY_TOOL_ANNOTATIONS,
} from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";

export const getPermissionCatalogTool = defineTool({
  name: "get_permission_catalog",
  group: ToolGroup.Roles,
  title: "Get the permission catalog",
  description: `Gives the permissions that the role page of SAM offers as a checkbox: the permission string with the section, the title and the description of the role page. Besides these strings, a role can have two kinds of rules. otherRole;<operation>;roleId=<role id or *> gives access to other roles (operations: ${ROLE_RULE_OPERATIONS.join(", ")}; read shows the role, assign gives the role to citizens, dismiss takes the role from citizens, manage does all). note;<operation>;noteTypeId=<note type id or *>;classificationLevelId=<classification level id or *>, optionally followed by ;alsoUnconfirmed=true, gives access to the notes of citizens (operations: ${NOTE_RULE_OPERATIONS.join(", ")}). Use the strings with change_role_permissions.`,
  annotations: READ_ONLY_TOOL_ANNOTATIONS,
  inputSchema: getPermissionCatalogInputSchema,
  outputSchema: z.strictObject({
    permissions: z.array(
      z.strictObject({
        permission_string: z.string(),
        section: z.string().describe("German."),
        title: z.string().describe("German."),
        description: z
          .string()
          .nullable()
          .describe("German. What the permission gives, or null."),
      }),
    ),
  }),
  isVisible: () => true,
  handler: getPermissionCatalog,
});
