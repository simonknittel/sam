import * as z from "zod";

/** An instant in UTC, for example `2026-10-17T18:00:00.000Z` */
export const dateTimeOutputSchema = z.iso.datetime();

export const citizenReferenceSchema = z.strictObject({
  id: z.string(),
  handle: z
    .string()
    .nullable()
    .describe(
      "Display text. It can change and it does not identify the citizen.",
    ),
});

export const eventReferenceSchema = z.strictObject({
  id: z.string(),
  name: z.string(),
});
