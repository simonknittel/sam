import {
  EventSourceType,
  EventVisibilityType,
  listEvents,
  listEventsInputSchema,
} from "@sam-monorepo/application";
import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { dateTimeOutputSchema } from "../../schemas.js";
import {
  defineTool,
  READ_ONLY_TOOL_ANNOTATIONS,
} from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";

export const listEventsTool = defineTool({
  name: "list_events",
  group: ToolGroup.Events,
  title: "List events",
  description:
    "Lists the events that the user can see, in pages. status: open (not ended yet, the default), new (open and not read by the user yet), closed (already started) or all; open and new are sorted by the start ascending, closed and all descending. participating: me gives only the events with an active sign-up of the user; type: app or discord filters by the source. Give next_cursor as cursor to continue the list. Use the event ids with get_event and get_event_lineup.",
  annotations: READ_ONLY_TOOL_ANNOTATIONS,
  readAuditEventType: AuditEventType.EVENTS_LISTED,
  inputSchema: listEventsInputSchema,
  outputSchema: z.strictObject({
    events: z.array(
      z.strictObject({
        id: z.string(),
        name: z.string(),
        start_time: dateTimeOutputSchema,
        end_time: dateTimeOutputSchema
          .nullable()
          .describe("Null when the event has no explicit end."),
        location: z.string().nullable(),
        source: z.enum(EventSourceType),
        visibility: z.enum(EventVisibilityType),
        participant_count: z.number().int().min(0),
        is_participating: z.boolean(),
        is_new: z.boolean(),
      }),
    ),
    next_cursor: z.string().nullable(),
  }),
  isVisible: (actor) => actor.authorize("event", "read"),
  handler: listEvents,
});
