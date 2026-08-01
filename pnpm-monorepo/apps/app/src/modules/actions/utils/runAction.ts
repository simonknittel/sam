"use client";

import { unstable_rethrow } from "next/navigation";
import toast from "react-hot-toast";
import type { ActionResponse } from "./createAction";

/**
 * Runs a server action outside a <form> (click handlers, drag'n'drop,
 * editor commands): toasts the outcome and reports whether it succeeded.
 * The form-bound counterpart is useAction().
 */
export const runAction = async (
  action: (formData: FormData) => Promise<ActionResponse>,
  formData: FormData,
  options?: {
    /** Success stays silent when false (e.g. drag'n'drop reordering) */
    successToast?: boolean;
    /** Overrides the generic message for unexpected (thrown) errors */
    unknownErrorMessage?: string;
  },
): Promise<boolean> => {
  try {
    const response = await action(formData);
    if ("error" in response) {
      toast.error(response.error);
      console.error(response);
      return false;
    }
    if (options?.successToast !== false) toast.success(response.success);
    return true;
  } catch (error) {
    unstable_rethrow(error);
    toast.error(
      options?.unknownErrorMessage ??
        "Ein unbekannter Fehler ist aufgetreten. Bitte versuche es später erneut.",
    );
    console.error(error);
    return false;
  }
};
