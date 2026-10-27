import {
  canSeeAnyRole,
  listRoleTags,
  listRoleTagsInputSchema,
} from "@sam-monorepo/application";
import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import {
  defineTool,
  READ_ONLY_TOOL_ANNOTATIONS,
} from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";
import { roleTagOutputSchema } from "./roleTagOutputSchema.js";

export const listRoleTagsTool = defineTool({
  name: "list_role_tags",
  group: ToolGroup.Roles,
  title: "List the role tags",
  description:
    "Gives the tags of roles that the user can see, sorted by name: the id, the name, the description as plain text, the icon URL and the ids of the roles of the tag that the user can see. A tag groups roles, for example for the role picker of the web app. A user sees a tag only when the user sees at least one role of the tag; with the permission to manage roles, the user sees all tags, also the tags without roles. Use the tag ids as the tag_id filter of list_roles, or with update_role. The tags change with create_role_tag, update_role_tag and delete_role_tag.",
  annotations: READ_ONLY_TOOL_ANNOTATIONS,
  readAuditEventType: AuditEventType.ROLE_TAGS_LISTED,
  inputSchema: listRoleTagsInputSchema,
  outputSchema: z.strictObject({
    tags: z.array(roleTagOutputSchema),
    next_cursor: z.string().nullable(),
  }),
  isVisible: (actor) =>
    canSeeAnyRole(actor) || actor.authorize("role", "manage"),
  handler: listRoleTags,
});
