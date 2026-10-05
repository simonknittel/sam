import { refresh } from "next/cache";

/**
 * The error response of a guard that finds the target of the request gone or
 * in a different state than the page showed. Examples: a different manager
 * deleted the event, or the event ended while the page was open. The refresh
 * shows the current state on the page. Call it only in a server action.
 */
export const rejectConflict = (error: string, formData: FormData) => {
  refresh();

  return { error, requestPayload: formData };
};
