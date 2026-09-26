import { isAdminBehindSession } from "@/modules/auth/utils/isAdminBehindSession";
import { log } from "@/modules/logging";
import type { z } from "zod";
import { createAuthenticatedAction } from "./createAction";

/**
 * An action of the admin toolbar. Only an admin can call it, also while they
 * assume a different user. It skips the confirmed-email and clearance gates:
 * the toolbar shows on the pages of these gates, and an assumed user can be
 * without clearance.
 */
export const createAdminAction = <T extends z.ZodTypeAny>(
  name: string,
  zodSchema: T,
  action: Parameters<typeof createAuthenticatedAction<T>>[2],
) =>
  createAuthenticatedAction(
    name,
    zodSchema,
    async (formData, authentication, data, t) => {
      if (!isAdminBehindSession(authentication.session)) {
        log.info("Forbidden request to action", {
          actionName: name,
          userId: authentication.session.user.id,
          reason: "No admin behind the session",
        });

        return {
          error: t("Common.forbidden"),
          requestPayload: formData,
        };
      }

      return action(formData, authentication, data, t);
    },
    { skipEmailConfirmationAndClearanceGates: true },
  );
