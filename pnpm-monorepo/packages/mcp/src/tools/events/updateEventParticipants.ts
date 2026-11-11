import {
  addEventParticipants,
  addEventParticipantsInputSchema,
  inviteEventParticipants,
  inviteEventParticipantsInputSchema,
  removeEventParticipants,
  removeEventParticipantsInputSchema,
  withdrawEventInvitations,
} from "@sam-monorepo/application";
import * as z from "zod";
import { defineTool } from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";
import {
  eventOutputSchema,
  isEventWriteToolVisible,
} from "./eventOutputSchema.js";

export enum EventParticipantsAction {
  Add = "add",
  Remove = "remove",
  Invite = "invite",
  WithdrawInvitation = "withdraw_invitation",
}

/** The text input of each action. The other actions refuse it. */
const TEXT_INPUT_BY_ACTION = {
  [EventParticipantsAction.Add]: "comment",
  [EventParticipantsAction.Remove]: "reason",
  [EventParticipantsAction.Invite]: "message",
  [EventParticipantsAction.WithdrawInvitation]: null,
} as const satisfies Record<
  EventParticipantsAction,
  "comment" | "reason" | "message" | null
>;

export const updateEventParticipantsTool = defineTool({
  name: "update_event_participants",
  group: ToolGroup.Events,
  title: "Update the participants of an event",
  description:
    "Changes the participants of an event of SAM (event_id from list_events) that has not ended, and notifies each changed citizen. Needs can_manage. invite: invites citizens (citizen_ids from search_citizens_and_organizations or get_event) to sign up; each citizen gets a notification with the message and accepts or declines in SAM; the citizens who are already signed up or invited are skipped. add: signs citizens up directly and withdraws their open invitations; the citizens who are already signed up are skipped. For invite and add, each citizen must be able to see the event, log in and get event notifications, else nothing changes. remove: each citizen must be a participant (from get_event), else nothing is removed; the position applications and the lineup assignments of the citizens at the event are removed too. withdraw_invitation: each citizen must have an open invitation (from get_event), else nothing is withdrawn; the citizens get no notification. message is only for invite, comment only for add, reason only for remove. An event with participation_enabled false refuses all actions. Gives the event like get_event and the ids of the changed citizens.",
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
        "The citizens to invite, to sign up, to remove or whose invitation to withdraw.",
      ),
      reason: removeEventParticipantsInputSchema.shape.reason,
      message: inviteEventParticipantsInputSchema.shape.message,
    })
    .refine(
      (input) =>
        (["comment", "reason", "message"] as const).every(
          (field) =>
            input[field] === undefined ||
            TEXT_INPUT_BY_ACTION[input.action] === field,
        ),
      "message is only for invite, comment only for add, reason only for remove.",
    ),
  outputSchema: z.strictObject({
    event: eventOutputSchema,
    changed_citizen_ids: z
      .array(z.string())
      .describe(
        "The citizens whose sign-up or invitation changed: for invite and add without the skipped citizens, for remove and withdraw_invitation all citizen_ids.",
      ),
  }),
  isVisible: isEventWriteToolVisible,
  handler: async (
    context,
    actor,
    { action, event_id, citizen_ids, comment, reason, message },
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

      case EventParticipantsAction.Invite: {
        const { invited_citizen_ids, ...output } =
          await inviteEventParticipants(context, actor, {
            event_id,
            citizen_ids,
            message,
          });
        return { ...output, changed_citizen_ids: invited_citizen_ids };
      }

      case EventParticipantsAction.WithdrawInvitation: {
        const { withdrawn_citizen_ids, ...output } =
          await withdrawEventInvitations(context, actor, {
            event_id,
            citizen_ids,
          });
        return { ...output, changed_citizen_ids: withdrawn_citizen_ids };
      }

      default:
        throw new Error(
          `Unknown event participants action: ${action satisfies never}`,
        );
    }
  },
});
