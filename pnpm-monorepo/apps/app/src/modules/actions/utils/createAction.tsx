import {
  authenticate,
  type requireAuthentication,
} from "@/modules/auth/server";
import { requireConfirmedEmailForAction } from "@/modules/auth/utils/emailConfirmation";
import { isAdminBehindSession } from "@/modules/auth/utils/isAdminBehindSession";
import { log } from "@/modules/logging";
import { getTracer } from "@/modules/tracing/utils/getTracer";
import { SpanStatusCode } from "@opentelemetry/api";
import { getTranslations } from "next-intl/server";
import { unstable_rethrow } from "next/navigation";
import { serializeError } from "serialize-error";
import type { z } from "zod";

export type ActionResponse =
  | {
      success: string;
      /**
       * Shown next to the success message when part of the work did not go
       * through but the app-side save stands — e.g. a published event whose
       * Discord counterpart could not be updated.
       */
      warning?: string;
    }
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

type Authentication = Exclude<
  Awaited<ReturnType<typeof requireAuthentication>>,
  false
>;

/** The check an action runs on the session before it validates the request */
export enum ActionGate {
  /**
   * The same confirmed-email and clearance (`login`/`manage`) gates as pages
   * and API routes
   */
  Clearance = "clearance",
  /**
   * Only an admin, also while they assume a different user. The admin
   * toolbar shows on the pages of the other gates, and an assumed user can
   * be without clearance.
   */
  Admin = "admin",
  /**
   * For the few actions which must be reachable before the other gates, e.g.
   * requesting the confirmation email itself
   */
  None = "none",
}

const passesGate = async (
  gate: ActionGate,
  authentication: Authentication,
  actionName: string,
) => {
  switch (gate) {
    case ActionGate.Clearance:
      try {
        await requireConfirmedEmailForAction(authentication.session);
      } catch {
        return false;
      }

      if (await authentication.authorize("login", "manage")) return true;

      log.info("Forbidden request to action", {
        actionName,
        userId: authentication.session.user.id,
        reason: "Missing clearance",
      });
      return false;

    case ActionGate.Admin:
      if (isAdminBehindSession(authentication.session)) return true;

      log.info("Forbidden request to action", {
        actionName,
        userId: authentication.session.user.id,
        reason: "No admin behind the session",
      });
      return false;

    case ActionGate.None:
      return true;

    default:
      throw new Error(`Unknown action gate: ${gate satisfies never}`);
  }
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
    authentication: Authentication,
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
    /** `ActionGate.Clearance` by default */
    gate?: ActionGate;
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

          if (
            !(await passesGate(
              options?.gate ?? ActionGate.Clearance,
              authentication,
              name,
            ))
          )
            return {
              error: t("Common.forbidden"),
              requestPayload: formData,
            };

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
