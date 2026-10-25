import {
  getPermissionCatalog,
  getPermissionCatalogInputSchema,
} from "@sam-monorepo/application";
import {
  AuditEventType,
  NOTE_RULE_OPERATIONS,
  ROLE_RULE_OPERATIONS,
  TWO_FACTOR_AUTHENTICATION_ROLE_RULE_OPERATIONS,
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
  description: `Gives the permissions that the role page of SAM offers as a checkbox: the permission string with the section, the title and the description of the role page. Besides these strings, a role can have two kinds of rules. otherRole;<operation>;roleId=<role id or *> gives access to other roles (operations: ${ROLE_RULE_OPERATIONS.join(", ")}; read shows the role, assign gives the role to citizens, dismiss takes the role from citizens, manage does all). note;<operation>;noteTypeId=<note type id or *>;classificationLevelId=<classification level id or *>, optionally followed by ;alsoUnconfirmed=true, gives access to the notes of citizens (operations: ${NOTE_RULE_OPERATIONS.join(", ")}). A citizen with a permission that has requires_two_factor_authentication, or with an otherRole rule with the operation ${TWO_FACTOR_AUTHENTICATION_ROLE_RULE_OPERATIONS.join(" or ")} (each role id), can use SAM only when their Discord account had the two-factor authentication at their last Discord login. Use the strings with change_role_permissions.`,
  annotations: READ_ONLY_TOOL_ANNOTATIONS,
  readAuditEventType: AuditEventType.PERMISSION_CATALOG_READ,
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
        requires_two_factor_authentication: z
          .boolean()
          .describe(
            "True when a citizen with the permission needs the two-factor authentication of their Discord account to use SAM.",
          ),
      }),
    ),
  }),
  isVisible: () => true,
  handler: getPermissionCatalog,
});
