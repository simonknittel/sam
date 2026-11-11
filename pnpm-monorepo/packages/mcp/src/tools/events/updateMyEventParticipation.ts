import {
  acceptEventInvitation,
  cancelEventParticipation,
  declineEventInvitation,
  eventParticipationInputSchema,
  signUpForEvent,
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
}

export const updateMyEventParticipationTool = defineTool({
  name: "update_my_event_participation",
  group: ToolGroup.Events,
  title: "Update the own participation in an event",
  description:
    "Signs the user up for an event of SAM (event_id from list_events, source app) or cancels the sign-up of the user, before the end of the event, or answers the open invitation of the user (see invitations of get_event). sign_up also changes the comment of an existing sign-up; without a comment, an existing sign-up keeps its comment. A new sign-up accepts an open invitation. accept_invitation signs the user up and refuses without an open invitation. decline_invitation declines the open invitation; the comment is the reason for the organizers, and the user can still sign up later. cancel also removes the position applications and the lineup assignments of the user at the event; without a sign-up, the result is a conflict. comment is not for cancel. A Discord event takes its sign-ups only on Discord, and an event with participation_enabled false takes none. The organizers of the event get a notification about a new sign-up or a cancellation from 24 hours before the start, and always about an answer to an invitation and a cancellation that vacates lineup positions. Gives the event like get_event, with the new is_participating.",
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
        action !== MyEventParticipationAction.Cancel || comment === undefined,
      "comment is not for cancel.",
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

      default:
        throw new Error(
          `Unknown event participation action: ${action satisfies never}`,
        );
    }
  },
});
