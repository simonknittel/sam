import { listUsers, listUsersInputSchema } from "@sam-monorepo/application";
import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import {
  defineTool,
  READ_ONLY_TOOL_ANNOTATIONS,
} from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";
import { userOutputShape } from "./userOutputSchema.js";

export const listUsersTool = defineTool({
  name: "list_users",
  group: ToolGroup.Users,
  title: "List the users",
  description:
    "Gives the users of SAM, the newest first, with the fields of get_user (without client). Filter by a part of the handle of the citizen, by the ban status and by the two-factor status of the last Discord login.",
  annotations: READ_ONLY_TOOL_ANNOTATIONS,
  readAuditEventType: AuditEventType.USERS_LISTED,
  inputSchema: listUsersInputSchema,
  outputSchema: z.strictObject({
    users: z.array(z.strictObject(userOutputShape)),
    next_cursor: z.string().nullable(),
  }),
  isVisible: (actor) => actor.authorize("user", "read"),
  handler: listUsers,
});
