import { getApplicationContext } from "@/modules/application";
import {
  AuthorizationClientErrorReason,
  grantCustomNameSchema,
  mcpToolNameSchema,
  type AuthorizationRequestValidation,
  type AuthorizationRequestValidationKind,
} from "@sam-monorepo/application";
import { listToolCatalog } from "@sam-monorepo/mcp";
import * as z from "zod";
import { isMcpServerDisabled } from "./isMcpServerDisabled";

export enum ConsentAvailability {
  Available = "available",
  /** The kill switch is on */
  Disabled = "disabled",
  /** The app cannot sign access tokens */
  NoSigningKey = "noSigningKey",
}

export const getConsentAvailability = async () => {
  if (await isMcpServerDisabled()) return ConsentAvailability.Disabled;

  if (!(await getApplicationContext().signingKey()))
    return ConsentAvailability.NoSigningKey;

  return ConsentAvailability.Available;
};

export const CONSENT_UNAVAILABLE_MESSAGE =
  "Die Verbindung von Anwendungen über MCP ist zurzeit nicht verfügbar.";

export const MCP_ACCESS_MESSAGE =
  "Du hast keine Berechtigung, den MCP-Server zu nutzen. Frage einen Admin nach der Berechtigung „MCP-Server nutzen“.";

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

/**
 * The request of the client has an error, but its client and its redirect
 * URI are valid. The description is a short English text without internal
 * data.
 */
export const getRedirectErrorMessage = (description: string) =>
  `Die Anfrage der Anwendung ist ungültig: ${description}`;

/** The host, or the scheme of a native app without a host */
export const getRedirectTarget = (redirectUri: string) => {
  const url = new URL(redirectUri);

  return url.host || url.protocol;
};

/**
 * The hidden fields of the approve and deny forms: the validated parameters
 * of the authorization request. The actions validate them again.
 */
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
 * The fields of the approve and deny forms (see `toConsentFormParameters()`).
 * A field can be missing or not valid: the use case validates them. The
 * schema removes other fields, and the limit keeps large values out of the
 * use case.
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
 * The fields of the approve form: the fields of the request and the settings
 * of the new grant. A form of a page from before these settings has no
 * name. A list without duplicates is never longer than the catalog.
 */
export const approveFormSchema = consentFormSchema.extend({
  custom_name: grantCustomNameSchema.optional(),
  disabled_tool_names: z.array(mcpToolNameSchema).max(listToolCatalog().length),
});

export const parseApproveFormData = (formData: FormData) => ({
  ...Object.fromEntries(formData.entries()),
  disabled_tool_names: formData.getAll("disabled_tool_names"),
});
