import {
  addEventManagers,
  addEventManagersInputSchema,
  removeEventManagers,
} from "@sam-monorepo/application";
import * as z from "zod";
import { defineTool } from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";
import {
  eventOutputSchema,
  isEventWriteToolVisible,
} from "./eventOutputSchema.js";

export enum EventManagersAction {
  Add = "add",
  Remove = "remove",
}

export const updateEventManagersTool = defineTool({
  name: "update_event_managers",
  group: ToolGroup.Events,
  title: "Update the managers of an event",
  description:
    "Adds managers to an event (event_id from list_events) that has not ended, or removes managers from it. Needs can_manage. add makes the citizens (citizen_ids from search_citizens_and_organizations) managers and skips the citizens who already manage the event. remove takes the manager role from the citizens (citizen_ids from the managers of get_event); when one of them is not a manager, nothing changes and the result is a conflict. The creator of the event stays its organizer. Gives the event like get_event.",
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: false,
  },
  // The two use cases have the same input
  inputSchema: addEventManagersInputSchema.extend({
    action: z.enum(EventManagersAction),
    citizen_ids: addEventManagersInputSchema.shape.citizen_ids.describe(
      "The citizens who become managers or who lose the manager role. Managers can change the event, its participants, its managers and its lineup.",
    ),
  }),
  outputSchema: eventOutputSchema,
  isVisible: isEventWriteToolVisible,
  handler: async (context, actor, { action, ...input }) => {
    switch (action) {
      case EventManagersAction.Add:
        return addEventManagers(context, actor, input);

      case EventManagersAction.Remove:
        return removeEventManagers(context, actor, input);

      default:
        throw new Error(
          `Unknown event managers action: ${action satisfies never}`,
        );
    }
  },
});
