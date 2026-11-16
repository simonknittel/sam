import * as z from "zod";

/**
 * The bounds of a query of a date range of the Log Analyzer: at least one
 * bound, and the start before the end. Combine it with the other fields of
 * the query through `.and()`.
 */
export const dateRangeInputSchema = z
  .object({
    from: z.date().optional(),
    /** Exclusive */
    to: z.date().optional(),
  })
  .refine(({ from, to }) => from !== undefined || to !== undefined, {
    error: "A date range needs at least one bound",
  })
  .refine(({ from, to }) => !from || !to || from < to, {
    error: "The start of a date range must be before its end",
  });
