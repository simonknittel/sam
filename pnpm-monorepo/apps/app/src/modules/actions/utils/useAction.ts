import { useTranslations } from "next-intl";
import { unstable_rethrow } from "next/navigation";
import { useActionState } from "react";
import toast from "react-hot-toast";
import type { ActionResponse } from "./createAction";

export const useAction = (
  action: (formData: FormData) => Promise<ActionResponse | void>,
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

        /**
         * Actions that `redirect()` on success resolve without a response
         * (the navigation is already in flight). Only run the success hook,
         * e.g. to close a modal before the new page renders.
         */
        if (!response) {
          options?.onSuccess?.(formData);
          return null;
        }

        if ("error" in response) {
          if (options?.errorToast !== false) toast.error(response.error);
          console.error(response);
          return response;
        }

        toast.success(response.success);
        options?.onSuccess?.(formData);
        return response;
      } catch (error) {
        unstable_rethrow(error);
        if (options?.errorToast !== false)
          toast.error(t("Common.internalServerError"));
        console.error(error);
        return {
          error: t("Common.internalServerError"),
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

  return { state, formAction, isPending, getDefaultValueWithFallback };
};
