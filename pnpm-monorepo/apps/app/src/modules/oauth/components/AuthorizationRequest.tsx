import { getApplicationContext, getRequestActor } from "@/modules/application";
import {
  AuthorizationRequestValidationKind,
  buildAuthorizationResponseUrl,
  canUseMcp,
  validateAuthorizationRequest,
  type AuthorizationRequestParameters,
} from "@sam-monorepo/application";
import {
  ASSUMED_USER_MESSAGE,
  CONSENT_UNAVAILABLE_MESSAGE,
  ConsentAvailability,
  getClientErrorMessage,
  getConsentAvailability,
  getRedirectErrorMessage,
  MCP_ACCESS_MESSAGE,
} from "../utils/consent";
import { AuthorizationConsent } from "./AuthorizationConsent";
import { AuthorizationNotice } from "./AuthorizationNotice";

interface Props {
  readonly parameters: AuthorizationRequestParameters;
  /** The grant must belong to the user who gives the consent */
  readonly isAssumedUser: boolean;
}

/**
 * Validates the authorization request and asks for the consent. A request
 * with a valid client and redirect URI, but with other invalid parameters,
 * gets a link back to the client with the error (RFC 6749 section
 * 4.1.2.1). An automatic redirect would make the page an open redirector,
 * because each Client ID Metadata Document is a valid client.
 */
export const AuthorizationRequest = async ({
  parameters,
  isAssumedUser,
}: Props) => {
  if ((await getConsentAvailability()) !== ConsentAvailability.Available)
    return <AuthorizationNotice message={CONSENT_UNAVAILABLE_MESSAGE} />;

  if (isAssumedUser)
    return <AuthorizationNotice message={ASSUMED_USER_MESSAGE} />;

  const actor = await getRequestActor();
  if (!canUseMcp(actor))
    return <AuthorizationNotice message={MCP_ACCESS_MESSAGE} />;

  const context = getApplicationContext();
  const validation = await validateAuthorizationRequest(context, parameters);

  switch (validation.kind) {
    case AuthorizationRequestValidationKind.Valid:
      return <AuthorizationConsent validation={validation} actor={actor} />;

    case AuthorizationRequestValidationKind.ClientError:
      return (
        <AuthorizationNotice
          message={getClientErrorMessage(validation.reason)}
        />
      );

    case AuthorizationRequestValidationKind.RedirectError:
      return (
        <AuthorizationNotice
          message={getRedirectErrorMessage(validation.description)}
          errorResponseUrl={buildAuthorizationResponseUrl(
            context,
            validation.redirectUri,
            {
              error: validation.error,
              error_description: validation.description,
              state: validation.state,
            },
          )}
        />
      );

    default:
      throw new Error(`Unknown validation kind: ${validation satisfies never}`);
  }
};
