import * as z from "zod";
import { dateTimeOutputSchema } from "../../schemas.js";

const penaltyEntryCitizenSchema = z.strictObject({
  id: z.string(),
  handle: z.string().nullable().describe("Null for a deleted citizen."),
  deleted_at: dateTimeOutputSchema.nullable(),
});

export const penaltyEntryOutputSchema = z.strictObject({
  id: z.string(),
  citizen: penaltyEntryCitizenSchema,
  points: z.number().int(),
  reason: z.string().nullable(),
  created_at: dateTimeOutputSchema,
  created_by: penaltyEntryCitizenSchema.nullable(),
  expires_at: dateTimeOutputSchema.nullable(),
  deleted_at: dateTimeOutputSchema.nullable(),
});
