import {
  acceptEventInvitation,
  applyForEvent,
  cancelEventParticipation,
  declineEventInvitation,
  eventParticipationInputSchema,
  signUpForEvent,
  withdrawEventApplication,
} from "@sam-monorepo/application";
import * as z from "zod";
import { defineTool } from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";
import {
  eventOutputSchema,
  isEventWriteToolVisible,
} from "./eventOutputSchema.js";

export enum MyEventParticipationAction {
  SignUp = "sign_up",
  Cancel = "cancel",
  AcceptInvitation = "accept_invitation",
  DeclineInvitation = "decline_invitation",
  Apply = "apply",
  WithdrawApplication = "withdraw_application",
}

const ACTIONS_WITHOUT_COMMENT: ReadonlySet<MyEventParticipationAction> =
  new Set([
    MyEventParticipationAction.Cancel,
    MyEventParticipationAction.WithdrawApplication,
  ]);

export const updateMyEventParticipationTool = defineTool({
  name: "update_my_event_participation",
  group: ToolGroup.Events,
  title: "Update the own participation in an event",
  description:
    "Signs the user up for an event of SAM (event_id from list_events, source app) or cancels the sign-up of the user, before the end of the event, answers the open invitation of the user (see invitations of get_event), or applies to take part. sign_up also changes the comment of an existing sign-up; without a comment, an existing sign-up keeps its comment. A new sign-up accepts an open invitation. While application_required is true, a new sign-up of a user without can_manage (see get_event) needs an open invitation: apply sends an application with the comment to the managers instead, who approve it (this signs the user up with the comment) or decline it; after a decline, the user cannot apply again. A user with can_manage signs up directly and cannot apply. withdraw_application withdraws the open application of the user (see applications of get_event). accept_invitation signs the user up and refuses without an open invitation. decline_invitation declines the open invitation; the comment is the reason for the organizers, and the user can still sign up or apply later. cancel also removes the position applications and the lineup assignments of the user at the event; without a sign-up, the result is a conflict. comment is not for cancel and withdraw_application. A Discord event takes its sign-ups only on Discord, and an event with participation_enabled false takes none. The organizers of the event get a notification about a new sign-up or a cancellation from 24 hours before the start, and always about an answer to an invitation, a new application and a cancellation that vacates lineup positions. Gives the event like get_event, with the new is_participating.",
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: false,
  },
  inputSchema: eventParticipationInputSchema
    .extend({
      action: z.enum(MyEventParticipationAction),
    })
    .refine(
      ({ action, comment }) =>
        !ACTIONS_WITHOUT_COMMENT.has(action) || comment === undefined,
      "comment is not for cancel and withdraw_application.",
    ),
  outputSchema: eventOutputSchema,
  isVisible: isEventWriteToolVisible,
  handler: async (context, actor, { action, event_id, comment }) => {
    switch (action) {
      case MyEventParticipationAction.SignUp:
        return signUpForEvent(context, actor, { event_id, comment });

      case MyEventParticipationAction.Cancel:
        return cancelEventParticipation(context, actor, { event_id });

      case MyEventParticipationAction.AcceptInvitation:
        return acceptEventInvitation(context, actor, { event_id, comment });

      case MyEventParticipationAction.DeclineInvitation:
        return declineEventInvitation(context, actor, { event_id, comment });

      case MyEventParticipationAction.Apply:
        return applyForEvent(context, actor, { event_id, comment });

      case MyEventParticipationAction.WithdrawApplication:
        return withdrawEventApplication(context, actor, { event_id });

      default:
        throw new Error(
          `Unknown event participation action: ${action satisfies never}`,
        );
    }
  },
});
