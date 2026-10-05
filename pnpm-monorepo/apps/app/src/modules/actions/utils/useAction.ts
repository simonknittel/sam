import { useTranslations } from "next-intl";
import { unstable_rethrow } from "next/navigation";
import { startTransition, useActionState, type FormEventHandler } from "react";
import toast from "react-hot-toast";
import type { ActionResponse } from "./createAction";
import { toastWarning } from "./toastWarning";

export const useAction = (
  action: (formData: FormData) => Promise<ActionResponse>,
  options?: {
    /** Receives the submitted FormData, e.g. to branch on the clicked submit button */
    onSuccess?: (formData: FormData) => void;
    /**
     * Disable the error toast where the form renders the error inline
     * (see ActionErrorNote) — errors should surface once, not twice.
     */
    errorToast?: boolean;
  },
) => {
  const t = useTranslations();

  const [state, formAction, isPending] = useActionState(
    async (previousState: unknown, formData: FormData) => {
      try {
        const response = await action(formData);

        if ("error" in response) {
          if (options?.errorToast !== false) toast.error(response.error);
          console.error(response);
          return response;
        }

        toast.success(response.success);
        /**
         * A second toast rather than an appendix to the success message: the
         * work did succeed, and the part that did not should not be read as
         * green.
         */
        if (response.warning) toastWarning(response.warning);
        options?.onSuccess?.(formData);
        return response;
      } catch (error) {
        unstable_rethrow(error);
        // A toast and the state are plain text: the support link becomes text
        const message = t.markup("Common.internalServerError", {
          link: (chunks) => chunks,
        });
        if (options?.errorToast !== false) toast.error(message);
        console.error(error);
        return {
          error: message,
          requestPayload: formData,
        };
      }
    },
    null,
  );

  /**
   * Since Next.js resets a form after submission, we include the original
   * request payload in the response for the respective client component
   * being able to repopulate the form with the previous values. See
   * `createAuthenticatedAction()` for more details.
   *
   * This helper function simplifies retrieving the previous value for a
   * given form field, falling back to a specified default value if the
   * form field is not present in the payload or if there is no payload.
   */
  const getDefaultValueWithFallback = (
    formFieldName: string,
    fallback: string | number | readonly string[] | undefined,
  ) => {
    if (state && "requestPayload" in state) {
      const value = state.requestPayload.get(formFieldName) as
        string | number | readonly string[] | undefined; // TODO: What about File?

      if (value) return value;
    }

    return fallback;
  };

  /**
   * The `onSubmit` handler for a form that must keep its values after the
   * action. React resets a `<form action>` form after each action, also
   * after an error, and a select then falls back to its first option. The
   * clicked submit button goes into the FormData, as with a native submit.
   */
  const submitWithoutReset: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    const formData = new FormData(
      event.currentTarget,
      (event.nativeEvent as SubmitEvent).submitter,
    );
    startTransition(() => formAction(formData));
  };

  return {
    state,
    formAction,
    isPending,
    getDefaultValueWithFallback,
    submitWithoutReset,
  };
};
