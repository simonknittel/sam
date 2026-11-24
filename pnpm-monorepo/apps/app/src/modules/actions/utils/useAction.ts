import { useTranslations } from "next-intl";
import { unstable_rethrow } from "next/navigation";
import { startTransition, useActionState, type FormEventHandler } from "react";
import toast from "react-hot-toast";
import type { ActionResponse } from "./createAction";
import { toastWarning } from "./toastWarning";

export const useAction = (
  action: (formData: FormData) => Promise<ActionResponse>,
  options?: {
    onSuccess?: (formData: FormData) => void;
    /**
     * False for a form that renders the error inline (see `ActionErrorNote`).
     * Keep the toast when the refresh after a conflict, for example a target
     * that a different user deleted, can remove the form.
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
   * action. React resets a `<form action>` form after each action, also after
   * an error, and a select then falls back to its first option. `useFormStatus`
   * (for example in `SubmitButton`) sees no submit of such a form: show the
   * pending state with `isPending`.
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
