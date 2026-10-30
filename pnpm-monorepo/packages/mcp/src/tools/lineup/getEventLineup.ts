import {
  getEventLineup,
  getEventLineupInputSchema,
} from "@sam-monorepo/application";
import { AuditEventType } from "@sam-monorepo/domain";
import {
  defineTool,
  READ_ONLY_TOOL_ANNOTATIONS,
} from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";
import {
  eventLineupSchema,
  isLineupToolVisible,
} from "./lineupOutputSchemas.js";

export const getEventLineupTool = defineTool({
  name: "get_event_lineup",
  group: ToolGroup.Lineup,
  title: "Get the lineup of an event",
  description:
    "Gives the lineup of an event by its event id (from list_events): the tree of positions (up to four levels) with the required ship variants, the assigned citizen and the citizens who applied (only when can_manage_positions is true, else empty). Only for events whose lineup is enabled, or whose positions the user can manage. An event with participation_enabled false (from get_event) has no lineup: then this tool and the lineup write tools give a conflict. A deleted citizen shows as null or is left out.",
  annotations: READ_ONLY_TOOL_ANNOTATIONS,
  readAuditEventType: AuditEventType.EVENT_LINEUP_READ,
  inputSchema: getEventLineupInputSchema,
  outputSchema: eventLineupSchema,
  isVisible: isLineupToolVisible,
  handler: getEventLineup,
});
