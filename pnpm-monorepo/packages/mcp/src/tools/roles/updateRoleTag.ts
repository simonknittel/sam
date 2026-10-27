import {
  updateRoleTag,
  updateRoleTagInputSchema,
} from "@sam-monorepo/application";
import { defineTool } from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";
import { roleTagOutputSchema } from "./roleTagOutputSchema.js";

export const updateRoleTagTool = defineTool({
  name: "update_role_tag",
  group: ToolGroup.Roles,
  title: "Update a role tag",
  description:
    "Changes the name and the description of a tag (tag_id from list_role_tags), and adds roles to it (add_role_ids from list_roles) or removes roles from it (remove_role_ids). The fields that are not given stay; null or an empty text removes the description. The other roles of the tag stay. A name that a different tag has, or a role in add_role_ids and in remove_role_ids, gives a ValidationError. The tags of one role also change with update_role. Only with the permission to manage roles. Gives the tag after the change like list_role_tags.",
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  inputSchema: updateRoleTagInputSchema,
  outputSchema: roleTagOutputSchema,
  isVisible: (actor) => actor.authorize("role", "manage"),
  handler: updateRoleTag,
});
