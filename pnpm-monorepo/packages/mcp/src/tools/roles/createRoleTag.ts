import {
  createRoleTag,
  createRoleTagInputSchema,
} from "@sam-monorepo/application";
import { defineTool } from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";
import { roleTagOutputSchema } from "./roleTagOutputSchema.js";

export const createRoleTagTool = defineTool({
  name: "create_role_tag",
  group: ToolGroup.Roles,
  title: "Create a role tag",
  description:
    "Creates a tag, optionally with its first roles (role_ids from list_roles). A tag groups roles. Each tag has a different name, without regard to the case; a name that a different tag has gives a ValidationError. The icon of a tag can only be set in the SAM web app. Only with the permission to manage roles. Gives the new tag like list_role_tags.",
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  inputSchema: createRoleTagInputSchema,
  outputSchema: roleTagOutputSchema,
  isVisible: (actor) => actor.authorize("role", "manage"),
  handler: createRoleTag,
});
