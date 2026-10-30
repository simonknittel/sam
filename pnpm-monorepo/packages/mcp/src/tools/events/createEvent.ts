import { createEvent, createEventInputSchema } from "@sam-monorepo/application";
import * as z from "zod";
import { notificationsSentSchema } from "../../schemas.js";
import { defineTool } from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";
import { eventOutputSchema } from "./eventOutputSchema.js";

export const createEventTool = defineTool({
  name: "create_event",
  group: ToolGroup.Events,
  title: "Create an event",
  description:
    "Creates an event in SAM with the user as its creator and organizer, and notifies the users who can see it. Give the name, the start and the end, the visibility and, for a restricted event, the visibility role ids (from list_roles). participation_enabled false creates the event without sign-up and lineup. Templates, cover images, the location and the publication on Discord are only available in the SAM web app. Gives the new event like get_event.",
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  inputSchema: createEventInputSchema,
  outputSchema: z.strictObject({
    event: eventOutputSchema,
    notifications_sent: notificationsSentSchema,
  }),
  isVisible: (actor) =>
    actor.authorize("event", "create") && actor.citizen !== null,
  handler: (context, actor, input) => createEvent(context, actor, input),
});
