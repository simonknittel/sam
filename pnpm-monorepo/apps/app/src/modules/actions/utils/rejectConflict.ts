import { refresh } from "next/cache";

/**
 * For a guard that finds the target of the request gone or in a different state
 * than the page showed. The refresh shows the current state. Call it only in a
 * server action.
 */
export const rejectConflict = (error: string, formData: FormData) => {
  refresh();

  return { error, requestPayload: formData };
};
