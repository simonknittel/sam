import {
  EventSourceType,
  EventVisibilityType,
  type Actor,
} from "@sam-monorepo/application";
import { EventInvitationStatus } from "@sam-monorepo/domain";
import * as z from "zod";
import { citizenReferenceSchema, dateTimeOutputSchema } from "../../schemas.js";

/** One event as `get_event` gives it. The write tools give the same shape. */
export const eventOutputSchema = z.strictObject({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  start_time: dateTimeOutputSchema,
  end_time: dateTimeOutputSchema
    .nullable()
    .describe("Null when the event has no explicit end."),
  location: z.string().nullable(),
  visibility: z.enum(EventVisibilityType),
  visibility_role_ids: z.array(z.string()),
  source: z.enum(EventSourceType),
  lineup_enabled: z.boolean(),
  participation_enabled: z
    .boolean()
    .describe(
      "False when a manager turned off the participation: nobody can sign up or be added, and the lineup is not available.",
    ),
  created_by: citizenReferenceSchema.nullable(),
  managers: z.array(citizenReferenceSchema),
  participants: z.array(
    z.strictObject({
      citizen: citizenReferenceSchema.nullable(),
      comment: z.string().nullable(),
      created_at: dateTimeOutputSchema,
    }),
  ),
  invitations: z
    .array(
      z.strictObject({
        citizen: citizenReferenceSchema.nullable(),
        status: z.enum(EventInvitationStatus),
        message: z
          .string()
          .nullable()
          .describe("The note of the manager to the citizen."),
        decline_comment: z
          .string()
          .nullable()
          .describe("The note of the citizen when they declined."),
        invited_by: citizenReferenceSchema.nullable(),
        created_at: dateTimeOutputSchema,
      }),
    )
    .describe(
      "The open invitations, and the declined invitations of citizens who did not sign up later. The newest first.",
    ),
  can_manage: z.boolean(),
  can_manage_positions: z.boolean(),
  is_updatable: z.boolean(),
  is_participating: z.boolean(),
});

/**
 * The write tools of an existing event give the event like `get_event`, thus
 * they need the same permission and a citizen. The use case checks the
 * manage rules.
 */
export const isEventWriteToolVisible = (actor: Actor) =>
  actor.authorize("event", "read") && actor.citizen !== null;
