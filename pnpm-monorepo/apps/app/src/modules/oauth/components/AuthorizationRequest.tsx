import { getApplicationContext, getRequestActor } from "@/modules/application";
import {
  AuthorizationRequestValidationKind,
  buildAuthorizationResponseUrl,
  canUseOAuthResource,
  toOAuthResourceActor,
  validateAuthorizationRequest,
  type AuthorizationRequestParameters,
} from "@sam-monorepo/application";
import {
  ASSUMED_USER_MESSAGE,
  ConsentAvailability,
  getClientErrorMessage,
  getConsentAvailability,
  getConsentUnavailableMessage,
  getRedirectErrorMessage,
  getResourceAccessMessage,
} from "../utils/consent";
import { getOAuthResourceOfClientParameter } from "../utils/isOAuthResourceTurnedOff";
import { AuthorizationConsent } from "./AuthorizationConsent";
import { AuthorizationNotice } from "./AuthorizationNotice";

interface Props {
  readonly parameters: AuthorizationRequestParameters;
  readonly isAssumedUser: boolean;
}

/**
 * A request with a valid client and redirect URI, but with other invalid
 * parameters, gets a link back to the client with the error (RFC 6749 section
 * 4.1.2.1). An automatic redirect would make the page an open redirector,
 * because each Client ID Metadata Document is a valid client.
 *
 * The client id selects the resource. The gates of the resource come before
 * the validation, thus a user without the permission makes the app fetch no
 * client document.
 */
export const AuthorizationRequest = async ({
  parameters,
  isAssumedUser,
}: Props) => {
  const resource = getOAuthResourceOfClientParameter(parameters.client_id);
  if (
    (await getConsentAvailability(resource)) !== ConsentAvailability.Available
  )
    return (
      <AuthorizationNotice message={getConsentUnavailableMessage(resource)} />
    );

  if (isAssumedUser)
    return <AuthorizationNotice message={ASSUMED_USER_MESSAGE} />;

  const actor = toOAuthResourceActor(await getRequestActor(), resource);
  if (!canUseOAuthResource(actor, resource))
    return <AuthorizationNotice message={getResourceAccessMessage(resource)} />;

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
