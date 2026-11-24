import { AcquisitionSource } from "@sam-monorepo/application";
import * as z from "zod";
import { dateTimeOutputSchema } from "../../schemas.js";
import { shipVariantOutputSchema } from "./shipVariantOutputSchema.js";

export const shipOutputSchema = z.strictObject({
  id: z.string(),
  name: z.string().nullable(),
  acquisition_source: z
    .enum(AcquisitionSource)
    .nullable()
    .describe("Null for the ships from before SAM recorded the source."),
  note: z.string().nullable(),
  variant: shipVariantOutputSchema,
  created_at: dateTimeOutputSchema.nullable(),
  deleted_at: dateTimeOutputSchema.nullable(),
});
