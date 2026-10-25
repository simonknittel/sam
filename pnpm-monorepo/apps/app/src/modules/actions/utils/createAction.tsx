import { authenticate } from "@/modules/auth/server";
import { requireConfirmedEmailForAction } from "@/modules/auth/utils/emailConfirmation";
import { isAdminBehindSession } from "@/modules/auth/utils/isAdminBehindSession";
import { isMissingTwoFactorAuthenticationOfSession } from "@/modules/auth/utils/twoFactorAuthentication";
import { log } from "@/modules/logging";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { getTranslations } from "next-intl/server";
import { unstable_rethrow } from "next/navigation";
import type * as z from "zod";

export interface ActionSuccess {
  success: string;
  /**
   * Shown next to the success message when part of the work did not go
   * through but the app-side save stands — e.g. a published event whose
   * Discord counterpart could not be updated.
   */
  warning?: string;
}

export interface ActionError {
  error: string;
  /**
   * Since Next.js resets a form after submission, we include the original
   * request payload in the response for the respective client component
   * being able to repopulate the form with the previous values. See
   * `useAction()` for more details.
   */
  requestPayload: FormData;
}

export type ActionResponse = ActionSuccess | ActionError;

type Authentication = Exclude<Awaited<ReturnType<typeof authenticate>>, false>;

export type Translations = Awaited<ReturnType<typeof getTranslations>>;

/** The check an action runs on the session before it validates the request */
export enum ActionGate {
  /**
   * The same confirmed-email, clearance (`login`/`manage`) and two-factor
   * authentication gates as pages and API routes
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

      if (!(await authentication.authorize("login", "manage"))) {
        log.info("Forbidden request to action", {
          actionName,
          userId: authentication.session.user.id,
          reason: "Missing clearance",
        });
        return false;
      }

      if (isMissingTwoFactorAuthenticationOfSession(authentication.session)) {
        log.info("Forbidden request to action", {
          actionName,
          userId: authentication.session.user.id,
          reason: "Missing two-factor authentication",
        });
        return false;
      }

      return true;

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
 * The `Success` generic replaces the success response for actions that
 * respond with more than a text (e.g. a flag for the client component, which
 * `runAction()` gives back) — the wrapper's own responses are errors. Pass it
 * explicitly (it is NoInfer, so plain actions keep their exact
 * ActionResponse type).
 */
export const createAuthenticatedAction = <
  T extends z.ZodTypeAny,
  Success extends ActionSuccess = ActionSuccess,
>(
  name: string,
  zodSchema: T,
  action: (
    formData: FormData,
    authentication: Authentication,
    data: z.infer<T>,
    t: Translations,
  ) => Promise<ActionError | NoInfer<Success>>,
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
): ((formData: FormData) => Promise<ActionError | Success>) => {
  const parseFormData =
    options?.parseFormData ??
    ((formData: FormData) => Object.fromEntries(formData.entries()));

  const tracedAction = withTrace(
    name,
    async (
      formData: FormData,
      t: Translations,
    ): Promise<ActionError | Success> => {
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
      let input: unknown;
      try {
        input = parseFormData(formData);
      } catch (error) {
        // For example `JSON.parse()` of a field that is not valid JSON
        log.warn("Invalid form data", { actionName: name, error });

        return {
          error: t("Common.badRequest"),
          requestPayload: formData,
        };
      }

      const result = zodSchema.safeParse(input);
      if (!result.success) {
        log.warn("Invalid Zod schema", {
          actionName: name,
          error: result.error,
        });

        return {
          error: t("Common.badRequest"),
          requestPayload: formData,
        };
      }

      return action(formData, authentication, result.data, t);
    },
  );

  return async (formData: FormData) => {
    const t = await getTranslations();

    try {
      return await tracedAction(formData, t);
    } catch (error) {
      unstable_rethrow(error);
      log.error("Internal Server Error", { actionName: name, error });
      return {
        // The response is plain text, thus the support link becomes text
        error: t.markup("Common.internalServerError", {
          link: (chunks) => chunks,
        }),
        requestPayload: formData,
      };
    }
  };
};
