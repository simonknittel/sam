import { updateRole, updateRoleInputSchema } from "@sam-monorepo/application";
import * as z from "zod";
import { defineTool } from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";

export const updateRoleTool = defineTool({
  name: "update_role",
  group: ToolGroup.Roles,
  title: "Update a role",
  description:
    "Changes the given fields of a role (role_id from list_roles or get_role): the name, the description as Markdown, the inactivity rules and the number of levels. add_tag_ids adds tags to the role and remove_tag_ids removes tags from it (tag ids from list_role_tags); the other tags of the role stay. The fields that are not given stay; null removes a value. A name that a different role has, or a tag in add_tag_ids and in remove_tag_ids, gives a ValidationError. The permissions change with change_role_permissions, the roles of one tag with update_role_tag. Only with the permission to manage roles. Gives the fields of the role after the change, without the tags; get_role gives the tags.",
  annotations: {
    readOnlyHint: false,
    // remove_tag_ids removes tags from the role
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: false,
  },
  inputSchema: updateRoleInputSchema,
  outputSchema: z.strictObject({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().describe("Markdown."),
    max_age_days: z.int().nullable(),
    assign_after_inactive_days: z.int().nullable(),
    max_level: z.int().nullable(),
  }),
  isVisible: (actor) => actor.authorize("role", "manage"),
  handler: updateRole,
});
