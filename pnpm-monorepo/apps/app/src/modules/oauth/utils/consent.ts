import { getApplicationContext } from "@/modules/application";
import {
  AuthorizationClientErrorReason,
  grantCustomNameSchema,
  mcpToolNameSchema,
  OAuthResource,
  type AuthorizationRequestValidation,
  type AuthorizationRequestValidationKind,
} from "@sam-monorepo/application";
import * as z from "zod";
import { isOAuthResourceTurnedOff } from "./isOAuthResourceTurnedOff";

export enum ConsentAvailability {
  Available = "available",
  Disabled = "disabled",
  NoSigningKey = "noSigningKey",
}

/** The kill switch of the resource of the client stops the consent */
export const getConsentAvailability = async (resource: OAuthResource) => {
  if (await isOAuthResourceTurnedOff(resource))
    return ConsentAvailability.Disabled;

  if (!(await getApplicationContext().signingKey()))
    return ConsentAvailability.NoSigningKey;

  return ConsentAvailability.Available;
};

const CONSENT_UNAVAILABLE_MESSAGES: Readonly<Record<OAuthResource, string>> = {
  [OAuthResource.Mcp]:
    "Die Verbindung von Anwendungen über MCP ist zurzeit nicht verfügbar.",
  [OAuthResource.RemoteControlProgram]:
    "Die Anmeldung des Desktop Companions ist zurzeit nicht verfügbar.",
};

export const getConsentUnavailableMessage = (resource: OAuthResource) =>
  CONSENT_UNAVAILABLE_MESSAGES[resource];

const RESOURCE_ACCESS_MESSAGES: Readonly<Record<OAuthResource, string>> = {
  [OAuthResource.Mcp]:
    "Du hast keine Berechtigung, den MCP-Server zu nutzen. Frage einen Admin nach der Berechtigung „MCP-Server nutzen“.",
  // Also for an admin: the desktop companion never has admin mode
  [OAuthResource.RemoteControlProgram]:
    "Du hast keine Berechtigung, das Remote Control Program zu nutzen.",
};

export const getResourceAccessMessage = (resource: OAuthResource) =>
  RESOURCE_ACCESS_MESSAGES[resource];

export const ASSUMED_USER_MESSAGE =
  "Du siehst SAM gerade als ein anderer Benutzer. Beende diese Ansicht, um eine Anwendung mit deinem Account zu verbinden.";

export const getClientErrorMessage = (
  reason: AuthorizationClientErrorReason,
) => {
  switch (reason) {
    case AuthorizationClientErrorReason.InvalidClientId:
      return "Die Anwendung hat keine gültige Client-ID gesendet.";
    case AuthorizationClientErrorReason.ClientMetadataUnavailable:
      return "Die Beschreibung der Anwendung konnte nicht geladen werden. Bitte versuche es später erneut.";
    case AuthorizationClientErrorReason.InvalidClientMetadata:
      return "Die Beschreibung der Anwendung ist ungültig.";
    case AuthorizationClientErrorReason.InvalidRedirectUri:
      return "Die Anwendung hat eine Weiterleitungsadresse gesendet, die sie nicht registriert hat.";
    default:
      throw new Error(`Unknown reason: ${reason satisfies never}`);
  }
};

/** The description is a short English text without internal data */
export const getRedirectErrorMessage = (description: string) =>
  `Die Anfrage der Anwendung ist ungültig: ${description}`;

/** The host, or the scheme of a native app without a host */
export const getRedirectTarget = (redirectUri: string) => {
  const url = new URL(redirectUri);

  return url.host || url.protocol;
};

export const toConsentFormParameters = (
  validation: Extract<
    AuthorizationRequestValidation,
    { kind: AuthorizationRequestValidationKind.Valid }
  >,
): Record<string, string> => ({
  response_type: "code",
  client_id: validation.client.clientId,
  redirect_uri: validation.redirectUri,
  code_challenge: validation.codeChallenge,
  code_challenge_method: "S256",
  scope: validation.scope,
  resource: validation.resource,
  ...(validation.state !== undefined && { state: validation.state }),
});

/**
 * The longest valid value of a form field is a URL (see `MAX_URL_LENGTH` of
 * the application package)
 */
const MAX_FORM_FIELD_LENGTH = 2048;

const consentFormFieldSchema = z.string().max(MAX_FORM_FIELD_LENGTH).optional();

/**
 * A field can be missing or not valid: the use case validates them. The limit
 * keeps large values out of the use case.
 */
export const consentFormSchema = z.object({
  response_type: consentFormFieldSchema,
  client_id: consentFormFieldSchema,
  redirect_uri: consentFormFieldSchema,
  code_challenge: consentFormFieldSchema,
  code_challenge_method: consentFormFieldSchema,
  scope: consentFormFieldSchema,
  resource: consentFormFieldSchema,
  state: consentFormFieldSchema,
});

/**
 * Far above the number of tools in the catalog. Not the size of the catalog:
 * a page from before a release can send a tool that the release removed.
 */
const MAXIMUM_DISABLED_TOOL_NAMES = 200;

export const approveFormSchema = consentFormSchema.extend({
  custom_name: grantCustomNameSchema.optional(),
  disabled_tool_names: z
    .array(mcpToolNameSchema)
    .max(MAXIMUM_DISABLED_TOOL_NAMES),
});

export const parseApproveFormData = (formData: FormData) => ({
  ...Object.fromEntries(formData.entries()),
  disabled_tool_names: formData.getAll("disabled_tool_names"),
});
