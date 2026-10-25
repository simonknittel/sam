import {
  listAuditEvents,
  listAuditEventsInputSchema,
} from "@sam-monorepo/application";
import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { citizenReferenceSchema, dateTimeOutputSchema } from "../../schemas.js";
import {
  defineTool,
  READ_ONLY_TOOL_ANNOTATIONS,
} from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";

const auditEventOutputSchema = z.strictObject({
  id: z.string(),
  type: z
    .string()
    .describe("The event type, for example TASK_CREATED or SHIP_CREATED_V2."),
  created_at: dateTimeOutputSchema,
  created_by: z
    .strictObject({
      user_id: z.string(),
      name: z.string().nullable(),
      citizen: citizenReferenceSchema
        .nullable()
        .describe(
          "The citizen of the user. Null for a user without a citizen or with a deleted citizen.",
        ),
    })
    .nullable()
    .describe(
      "The user who did the action. Null for an event without a user, for example an automation run.",
    ),
  triggered_via_mcp: z
    .boolean()
    .describe(
      "True when the user did the action through the MCP server. False for all other events, for example the actions in the web app, the OAuth endpoints and the automation runs.",
    ),
  // `z.json()` would need a cast: the use case gives the JSON column as
  // `unknown`. The column holds only JSON, thus `z.unknown()` is sufficient.
  data: z
    .unknown()
    .describe(
      "The payload with the keys as the app stored them, for example the ids of the changed items. Older events store it as a JSON-encoded string.",
    ),
});

export const listAuditEventsTool = defineTool({
  name: "list_audit_events",
  group: ToolGroup.SystemLog,
  title: "List the audit events",
  description:
    "Gives the system log of SAM, the newest first: the audited user actions and automation runs with their type, their time, the user who did it and the payload. Filter by the types, by the users (created_by_user_ids) or their citizens (created_by_citizen_ids), by a time range, by the actions through the MCP server (triggered_via_mcp) and by the kind of access (access: write, read or all). The list hides the high-volume types, unless a type filter is set or include_high_volume is true. It hides the reads through the MCP server, unless a type filter is set or access is read or all.",
  annotations: READ_ONLY_TOOL_ANNOTATIONS,
  readAuditEventType: AuditEventType.AUDIT_EVENTS_LISTED,
  inputSchema: listAuditEventsInputSchema,
  outputSchema: z.strictObject({
    events: z.array(auditEventOutputSchema),
    next_cursor: z.string().nullable(),
  }),
  isVisible: (actor) => actor.authorize("systemLog", "read"),
  handler: async (context, actor, input) => {
    const { events, next_cursor } = await listAuditEvents(
      context,
      actor,
      input,
    );

    return { events, next_cursor };
  },
});
