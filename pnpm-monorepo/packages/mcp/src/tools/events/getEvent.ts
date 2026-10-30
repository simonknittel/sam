import { getEvent, getEventInputSchema } from "@sam-monorepo/application";
import { AuditEventType } from "@sam-monorepo/domain";
import {
  defineTool,
  READ_ONLY_TOOL_ANNOTATIONS,
} from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";
import { eventOutputSchema } from "./eventOutputSchema.js";

export const getEventTool = defineTool({
  name: "get_event",
  group: ToolGroup.Events,
  title: "Get an event",
  description:
    "Gives one event by its event id (from list_events): the details, the creator, the managers, the active participants, whether the lineup and the participation are enabled, and what the user can do: can_manage (the event, its participants and its managers), can_manage_positions (the lineup) and is_updatable (false after the end of the event, then nothing can change). visibility_role_ids is empty when the user cannot manage the event. A deleted citizen shows as null.",
  annotations: READ_ONLY_TOOL_ANNOTATIONS,
  readAuditEventType: AuditEventType.EVENT_READ,
  inputSchema: getEventInputSchema,
  outputSchema: eventOutputSchema,
  isVisible: (actor) =>
    actor.authorize("event", "read") && actor.citizen !== null,
  handler: getEvent,
});
