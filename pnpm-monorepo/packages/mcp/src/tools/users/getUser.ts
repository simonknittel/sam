import {
  getUser,
  getUserInputSchema,
  isOwnUser,
} from "@sam-monorepo/application";
import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { getSettingsPageUrl } from "../../settingsPageUrl.js";
import {
  defineTool,
  READ_ONLY_TOOL_ANNOTATIONS,
} from "../../toolDefinition.js";
import { TOOL_GROUP_ORDER, ToolGroup } from "../../toolGroup.js";
import { userOutputShape } from "./userOutputSchema.js";

export const getUserTool = defineTool({
  name: "get_user",
  group: ToolGroup.Users,
  title: "Get a user",
  description:
    "Gives one user of SAM: the id, the Discord name, the redacted email address, the role, the Discord id, the two-factor status, the citizen and the ban. Without user_id: the signed-in user, also with this client (admin mode, the number of permissions, the tool groups that this client can use, and the URL of the page where the user selects the tools). A different user requires the permission to read the users.",
  annotations: READ_ONLY_TOOL_ANNOTATIONS,
  readAuditEventType: AuditEventType.USER_READ,
  inputSchema: getUserInputSchema,
  outputSchema: z.strictObject({
    ...userOutputShape,
    client: z
      .strictObject({
        admin_mode: z
          .boolean()
          .describe("Admin mode gives an admin all permissions."),
        permission_count: z.number().int().min(0),
        tool_groups: z.array(z.enum(ToolGroup)),
        settings_page_url: z.url(),
      })
      .nullable()
      .describe(
        "This MCP client of the signed-in user. Null for a different user.",
      ),
  }),
  isVisible: () => true,
  handler: async (context, actor, input, { availableTools }) => {
    const user = await getUser(context, actor, input);
    if (!isOwnUser(actor, input)) return { ...user, client: null };

    const availableGroups = new Set(availableTools.map((tool) => tool.group));

    return {
      ...user,
      client: {
        admin_mode: actor.adminMode,
        permission_count: actor.permissionSets.length,
        tool_groups: TOOL_GROUP_ORDER.filter((group) =>
          availableGroups.has(group),
        ),
        settings_page_url: getSettingsPageUrl(context),
      },
    };
  },
});
