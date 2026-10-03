import { ORGANIZATION_TIMEZONE, wallTimeToInstant } from "@sam-monorepo/domain";
import * as z from "zod";

/**
 * A `datetime-local` value ("YYYY-MM-DDTHH:mm") as a wall time in the time
 * zone of the organization. The output is the instant. A value in a
 * different format or not in the calendar, for example February 30, gives a
 * validation error.
 */
export const wallTimeSchema = z.string().transform((wallTime, context) => {
  try {
    return wallTimeToInstant(wallTime, ORGANIZATION_TIMEZONE);
  } catch {
    context.addIssue({ code: "custom", message: "Ungültiges Datum" });
    return z.NEVER;
  }
});
