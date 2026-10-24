import * as z from "zod";
import { citizenReferenceSchema, dateTimeOutputSchema } from "../../schemas.js";

/** A manual notification as send_manual_notification gives it */
export const manualNotificationOutputSchema = z.strictObject({
  id: z.string(),
  created_at: dateTimeOutputSchema,
  created_by: citizenReferenceSchema.nullable(),
  title: z.string(),
  body: z.string(),
  receiver_citizens: z
    .array(citizenReferenceSchema)
    .describe("The chosen citizens, before the filter for the login."),
  receiver_roles: z.array(
    z.strictObject({
      id: z.string(),
      name: z.string(),
    }),
  ),
});
