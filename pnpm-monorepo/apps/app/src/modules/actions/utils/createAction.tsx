import {
  authenticate,
  type requireAuthentication,
} from "@/modules/auth/server";
import { requireConfirmedEmailForAction } from "@/modules/auth/utils/emailConfirmation";
import { log } from "@/modules/logging";
import { getTracer } from "@/modules/tracing/utils/getTracer";
import { SpanStatusCode } from "@opentelemetry/api";
import { getTranslations } from "next-intl/server";
import { unstable_rethrow } from "next/navigation";
import { serializeError } from "serialize-error";
import type { z } from "zod";

export type ActionResponse =
  | { success: string }
  | {
      error: string;
      errorDetails?: unknown;
      /**
       * Since Next.js resets a form after submission, we include the original
       * request payload in the response for the respective client component
       * being able to repopulate the form with the previous values. See
       * `useAction()` for more details.
       */
      requestPayload: FormData;
    };

/**
 * The `Response` generic widens the return type for actions that respond
 * with more than an ActionResponse (e.g. a minted token) — the wrapper's
 * own error responses stay ActionResponse. Pass it explicitly (it is
 * NoInfer, so plain actions keep their exact ActionResponse type).
 */
export const createAuthenticatedAction = <
  T extends z.ZodTypeAny,
  Response = never,
>(
  name: string,
  zodSchema: T,
  action: (
    formData: FormData,
    authentication: Exclude<
      Awaited<ReturnType<typeof requireAuthentication>>,
      false
    >,
    data: z.infer<T>,
    t: Awaited<ReturnType<typeof getTranslations>>,
  ) => Promise<ActionResponse | NoInfer<Response>>,
  options?: {
    /**
     * Maps the FormData to the schema input. The default keeps only the
     * last value of a repeated field — actions with array fields
     * (formData.getAll) or per-field normalization pass their own mapping.
     */
    parseFormData?: (formData: FormData) => unknown;
    /**
     * By default actions enforce the same confirmed-email and clearance
     * (`login`/`manage`) gates as pages and API routes. The few actions
     * which must be reachable before passing those gates (e.g. requesting
     * the confirmation email itself) opt out with this flag.
     */
    skipEmailConfirmationAndClearanceGates?: boolean;
  },
): ((formData: FormData) => Promise<ActionResponse | Response>) => {
  return async (formData: FormData) => {
    const t = await getTranslations();

    try {
      return getTracer().startActiveSpan(name, async (span) => {
        try {
          /**
           * Authenticate the request
           */
          const authentication = await authenticate();
          if (!authentication)
            return {
              error: t("Common.forbidden"),
              requestPayload: formData,
            };

          if (!options?.skipEmailConfirmationAndClearanceGates) {
            try {
              await requireConfirmedEmailForAction(authentication.session);
            } catch {
              return {
                error: t("Common.forbidden"),
                requestPayload: formData,
              };
            }

            if (!(await authentication.authorize("login", "manage"))) {
              log.info("Forbidden request to action", {
                actionName: name,
                userId: authentication.session.user.id,
                reason: "Missing clearance",
              });

              return {
                error: t("Common.forbidden"),
                requestPayload: formData,
              };
            }
          }

          /**
           * Validate the request
           */
          const result = zodSchema.safeParse(
            options?.parseFormData
              ? options.parseFormData(formData)
              : Object.fromEntries(formData.entries()),
          );
          if (!result.success) {
            log.warn("Invalid Zod schema", {
              error: serializeError(result.error),
            });

            return {
              error: t("Common.badRequest"),
              errorDetails: result.error,
              requestPayload: formData,
            };
          }

          return await action(formData, authentication, result.data, t);
        } catch (error) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
          });
          throw error;
        } finally {
          span.end();
        }
      });
    } catch (error) {
      unstable_rethrow(error);
      log.error("Internal Server Error", { error: serializeError(error) });
      return {
        error: t("Common.internalServerError"),
        requestPayload: formData,
      };
    }
  };
};
