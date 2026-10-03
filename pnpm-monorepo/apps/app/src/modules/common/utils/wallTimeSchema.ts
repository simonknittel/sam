import { ORGANIZATION_TIMEZONE, wallTimeToInstant } from "@sam-monorepo/domain";
import * as z from "zod";

/**
 * A `datetime-local` value ("YYYY-MM-DDTHH:mm") as a wall time in the time
 * zone of the organization. The output is the instant. A value that is not
 * in the calendar, for example February 30, gives a validation error.
 */
export const wallTimeSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Ungültiges Datum")
  .transform((wallTime, context) => {
    try {
      return wallTimeToInstant(wallTime, ORGANIZATION_TIMEZONE);
    } catch {
      context.addIssue({ code: "custom", message: "Ungültiges Datum" });
      return z.NEVER;
    }
  });
