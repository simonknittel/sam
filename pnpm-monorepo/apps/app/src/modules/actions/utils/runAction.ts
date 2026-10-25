"use client";

import { unstable_rethrow } from "next/navigation";
import toast from "react-hot-toast";
import type { ActionError, ActionSuccess } from "./createAction";
import { toastWarning } from "./toastWarning";

/**
 * Runs a server action outside a <form> (click handlers, drag'n'drop,
 * editor commands): toasts the outcome and gives the response of a success,
 * or null after a failure. The form-bound counterpart is useAction().
 */
export const runAction = async <Success extends ActionSuccess>(
  action: (formData: FormData) => Promise<ActionError | Success>,
  formData: FormData,
  options?: {
    /** Success stays silent when false (e.g. drag'n'drop reordering) */
    successToast?: boolean;
    /** Overrides the generic message for unexpected (thrown) errors */
    unknownErrorMessage?: string;
  },
): Promise<Success | null> => {
  try {
    const response = await action(formData);
    if ("error" in response) {
      toast.error(response.error);
      console.error(response);
      return null;
    }
    if (options?.successToast !== false) toast.success(response.success);
    /** A silent success still reports the part of the work that failed */
    if (response.warning) toastWarning(response.warning);
    return response;
  } catch (error) {
    unstable_rethrow(error);
    toast.error(
      options?.unknownErrorMessage ??
        "Ein unbekannter Fehler ist aufgetreten. Bitte versuche es später erneut.",
    );
    console.error(error);
    return null;
  }
};
