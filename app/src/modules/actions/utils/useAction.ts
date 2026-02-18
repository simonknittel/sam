import { useTranslations } from "next-intl";
import { unstable_rethrow } from "next/navigation";
import { useActionState } from "react";
import toast from "react-hot-toast";
import type { createAuthenticatedAction } from "./createAction";

export const useAction = (
  action: ReturnType<typeof createAuthenticatedAction>,
  options?: { onSuccess?: () => void },
) => {
  const t = useTranslations();

  const [state, formAction, isPending] = useActionState(
    async (previousState: unknown, formData: FormData) => {
      try {
        const response = await action(formData);

        if ("error" in response) {
          toast.error(response.error);
          console.error(response);
          return response;
        }

        toast.success(response.success);
        options?.onSuccess?.();
        return response;
      } catch (error) {
        unstable_rethrow(error);
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
        | string
        | number
        | readonly string[]
        | undefined; // TODO: What about File?

      if (!value) return value;
    }

    return fallback;
  };

  return { state, formAction, isPending, getDefaultValueWithFallback };
};
