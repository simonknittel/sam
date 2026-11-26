"use server";

import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { getApplicationContext } from "@/modules/application";
import {
  AuthorizationErrorCode,
  AuthorizationRequestValidationKind,
  buildAuthorizationResponseUrl,
  validateAuthorizationRequest,
} from "@sam-monorepo/application";
import { redirect } from "next/navigation";
import {
  ConsentAvailability,
  consentFormSchema,
  getClientErrorMessage,
  getConsentAvailability,
  getConsentUnavailableMessage,
} from "../utils/consent";
import { getOAuthResourceOfClientParameter } from "../utils/isOAuthResourceTurnedOff";

/**
 * Validates the request again, thus a form with a different redirect URI cannot
 * make an open redirect. No check of the permission of the resource: a denial
 * gives no access.
 */
export const denyAuthorization = createAuthenticatedAction(
  "denyAuthorization",
  consentFormSchema,
  async (formData, _authentication, data) => {
    const resource = getOAuthResourceOfClientParameter(data.client_id);
    if (
      (await getConsentAvailability(resource)) !== ConsentAvailability.Available
    )
      return {
        error: getConsentUnavailableMessage(resource),
        requestPayload: formData,
      };

    const context = getApplicationContext();
    const validation = await validateAuthorizationRequest(context, data);

    switch (validation.kind) {
      case AuthorizationRequestValidationKind.Valid:
        return redirect(
          buildAuthorizationResponseUrl(context, validation.redirectUri, {
            error: AuthorizationErrorCode.AccessDenied,
            state: validation.state,
          }),
        );

      case AuthorizationRequestValidationKind.ClientError:
        return {
          error: getClientErrorMessage(validation.reason),
          requestPayload: formData,
        };

      case AuthorizationRequestValidationKind.RedirectError:
        return redirect(
          buildAuthorizationResponseUrl(context, validation.redirectUri, {
            error: validation.error,
            error_description: validation.description,
            state: validation.state,
          }),
        );

      default:
        throw new Error(
          `Unknown validation kind: ${validation satisfies never}`,
        );
    }
  },
);
