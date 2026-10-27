import {
  deleteRoleTag,
  deleteRoleTagInputSchema,
} from "@sam-monorepo/application";
import * as z from "zod";
import { defineTool } from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";

export const deleteRoleTagTool = defineTool({
  name: "delete_role_tag",
  group: ToolGroup.Roles,
  title: "Delete a role tag",
  description:
    "Deletes a tag permanently (tag_id from list_role_tags). The roles of the tag lose it, and the roles stay. The tag cannot be restored. Only with the permission to manage roles. Gives the id and the name of the deleted tag.",
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: false,
  },
  inputSchema: deleteRoleTagInputSchema,
  outputSchema: z.strictObject({
    id: z.string(),
    name: z.string(),
  }),
  isVisible: (actor) => actor.authorize("role", "manage"),
  handler: deleteRoleTag,
});
