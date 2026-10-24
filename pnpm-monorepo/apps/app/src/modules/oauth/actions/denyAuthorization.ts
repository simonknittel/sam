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
  CONSENT_UNAVAILABLE_MESSAGE,
  ConsentAvailability,
  consentFormSchema,
  getClientErrorMessage,
  getConsentAvailability,
} from "../utils/consent";

/**
 * Sends the browser back to the client with `access_denied`. The action
 * validates the request again, thus a form with a different redirect URI
 * cannot make an open redirect. No check of `mcp;use`: a denial gives no
 * access.
 */
export const denyAuthorization = createAuthenticatedAction(
  "denyAuthorization",
  consentFormSchema,
  async (formData, _authentication, data) => {
    if ((await getConsentAvailability()) !== ConsentAvailability.Available)
      return { error: CONSENT_UNAVAILABLE_MESSAGE, requestPayload: formData };

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
