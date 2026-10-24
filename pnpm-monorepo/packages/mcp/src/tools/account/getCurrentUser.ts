import type { Actor } from "@sam-monorepo/application";
import { UserRole } from "@sam-monorepo/database/browser";
import * as z from "zod";
import { citizenReferenceSchema } from "../../schemas.js";
import { getSettingsPageUrl } from "../../settingsPageUrl.js";
import {
  defineTool,
  READ_ONLY_TOOL_ANNOTATIONS,
} from "../../toolDefinition.js";
import { TOOL_GROUP_ORDER, ToolGroup } from "../../toolGroup.js";

export enum CurrentUserRole {
  Admin = "admin",
  User = "user",
}

const toCurrentUserRole = (userRole: Actor["userRole"]) => {
  switch (userRole) {
    case UserRole.ADMIN:
      return CurrentUserRole.Admin;

    // A user without a user role is a normal user
    case null:
      return CurrentUserRole.User;

    default:
      throw new Error(`Unknown user role: ${userRole satisfies never}`);
  }
};

export const getCurrentUserTool = defineTool({
  name: "get_current_user",
  group: ToolGroup.Account,
  title: "Get the current user",
  description:
    "Gives the signed-in user of SAM: the user id, the citizen (id and handle, or null for a user without a citizen), the user role, whether admin mode is on, the number of permissions, the tool groups that this client can use, and the URL of the page where the user selects the tools.",
  annotations: READ_ONLY_TOOL_ANNOTATIONS,
  inputSchema: z.strictObject({}),
  outputSchema: z.strictObject({
    user_id: z.string(),
    citizen: citizenReferenceSchema.nullable(),
    role: z.enum(CurrentUserRole),
    admin_mode: z
      .boolean()
      .describe("Admin mode gives an admin all permissions."),
    permission_count: z.number().int().min(0),
    tool_groups: z.array(z.enum(ToolGroup)),
    settings_page_url: z.url(),
  }),
  isVisible: () => true,
  handler: async (context, actor, _input, { availableTools }) => {
    const availableGroups = new Set(availableTools.map((tool) => tool.group));

    return {
      user_id: actor.userId,
      citizen: actor.citizen && {
        id: actor.citizen.id,
        handle: actor.citizen.handle,
      },
      role: toCurrentUserRole(actor.userRole),
      admin_mode: actor.adminMode,
      permission_count: actor.permissionSets.length,
      tool_groups: TOOL_GROUP_ORDER.filter((group) =>
        availableGroups.has(group),
      ),
      settings_page_url: getSettingsPageUrl(context),
    };
  },
});
