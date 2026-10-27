import {
  cancelEventParticipation,
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
}

export const updateMyEventParticipationTool = defineTool({
  name: "update_my_event_participation",
  group: ToolGroup.Events,
  title: "Update the own participation in an event",
  description:
    "Signs the user up for an event of SAM (event_id from list_events, source app) or cancels the sign-up of the user, before the end of the event. sign_up also changes the comment of an existing sign-up; without a comment, an existing sign-up keeps its comment. cancel also removes the position applications and the lineup assignments of the user at the event; without a sign-up, the result is a conflict. comment is only for sign_up. A Discord event takes its sign-ups only on Discord. Gives the event like get_event, with the new is_participating.",
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
        action === MyEventParticipationAction.SignUp || comment === undefined,
      "comment is only for sign_up.",
    ),
  outputSchema: eventOutputSchema,
  isVisible: isEventWriteToolVisible,
  handler: async (context, actor, { action, event_id, comment }) => {
    switch (action) {
      case MyEventParticipationAction.SignUp:
        return signUpForEvent(context, actor, { event_id, comment });

      case MyEventParticipationAction.Cancel:
        return cancelEventParticipation(context, actor, { event_id });

      default:
        throw new Error(
          `Unknown event participation action: ${action satisfies never}`,
        );
    }
  },
});
