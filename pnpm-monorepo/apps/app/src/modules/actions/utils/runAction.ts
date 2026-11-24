"use client";

import { unstable_rethrow } from "next/navigation";
import toast from "react-hot-toast";
import type { ActionError, ActionSuccess } from "./createAction";
import { toastWarning } from "./toastWarning";

/**
 * For an action outside of a <form> (click handlers, drag'n'drop, editor
 * commands). The form-bound counterpart is `useAction()`.
 */
export const runAction = async <Success extends ActionSuccess>(
  action: (formData: FormData) => Promise<ActionError | Success>,
  formData: FormData,
  options?: {
    successToast?: boolean;
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
