import { ShipVariantStatus } from "@sam-monorepo/application";
import * as z from "zod";

/** The uploaded logo of a manufacturer */
export const manufacturerLogoOutputSchema = z
  .strictObject({ upload_id: z.string(), mime_type: z.string() })
  .nullable();

/** A variant of the ship catalog as the fleet tools give it */
export const shipVariantOutputSchema = z.strictObject({
  id: z.string(),
  name: z.string(),
  status: z
    .enum(ShipVariantStatus)
    .nullable()
    .describe("Null when nobody set the status of the variant."),
  series: z.strictObject({ id: z.string(), name: z.string() }),
  manufacturer: z.strictObject({
    id: z.string(),
    name: z.string(),
    logo: manufacturerLogoOutputSchema,
  }),
  tags: z.array(
    z.strictObject({ id: z.string(), key: z.string(), value: z.string() }),
  ),
});
