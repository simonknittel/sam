import {
  addEventParticipants,
  addEventParticipantsInputSchema,
  removeEventParticipants,
  removeEventParticipantsInputSchema,
} from "@sam-monorepo/application";
import * as z from "zod";
import { notificationsSentSchema } from "../../schemas.js";
import { defineTool } from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";
import {
  eventOutputSchema,
  isEventWriteToolVisible,
} from "./eventOutputSchema.js";

export enum EventParticipantsAction {
  Add = "add",
  Remove = "remove",
}

export const updateEventParticipantsTool = defineTool({
  name: "update_event_participants",
  group: ToolGroup.Events,
  title: "Update the participants of an event",
  description:
    "Signs citizens up for an event of SAM (event_id from list_events) that has not ended, or cancels their sign-ups, and notifies each changed citizen. Needs can_manage. add: each citizen (citizen_ids from search_citizens_and_organizations or get_event) must be able to see the event, log in and get event notifications, else nothing is added; the citizens who are already signed up are skipped. remove: each citizen must be a participant (from get_event), else nothing is removed; the position applications and the lineup assignments of the citizens at the event are removed too. comment is only for add, reason only for remove. Gives the event like get_event and the ids of the changed citizens.",
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: false,
  },
  inputSchema: addEventParticipantsInputSchema
    .extend({
      action: z.enum(EventParticipantsAction),
      citizen_ids: addEventParticipantsInputSchema.shape.citizen_ids.describe(
        "The citizens to sign up or to remove.",
      ),
      reason: removeEventParticipantsInputSchema.shape.reason,
    })
    .refine(
      ({ action, comment, reason }) =>
        action === EventParticipantsAction.Add
          ? reason === undefined
          : comment === undefined,
      "comment is only for add, reason only for remove.",
    ),
  outputSchema: z.strictObject({
    event: eventOutputSchema,
    changed_citizen_ids: z
      .array(z.string())
      .describe(
        "The citizens whose sign-up changed: for add without the citizens who were already signed up, for remove all citizen_ids.",
      ),
    notifications_sent: notificationsSentSchema,
  }),
  isVisible: isEventWriteToolVisible,
  handler: async (
    context,
    actor,
    { action, event_id, citizen_ids, comment, reason },
  ) => {
    switch (action) {
      case EventParticipantsAction.Add: {
        const { added_citizen_ids, ...output } = await addEventParticipants(
          context,
          actor,
          { event_id, citizen_ids, comment },
        );
        return { ...output, changed_citizen_ids: added_citizen_ids };
      }

      case EventParticipantsAction.Remove: {
        const { removed_citizen_ids, ...output } =
          await removeEventParticipants(context, actor, {
            event_id,
            citizen_ids,
            reason,
          });
        return { ...output, changed_citizen_ids: removed_citizen_ids };
      }

      default:
        throw new Error(
          `Unknown event participants action: ${action satisfies never}`,
        );
    }
  },
});
