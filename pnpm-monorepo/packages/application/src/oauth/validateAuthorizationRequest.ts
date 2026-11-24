import * as z from "zod";
import type { ApplicationContext } from "../context.js";
import {
  MAX_URL_LENGTH,
  MCP_SCOPE,
  PKCE_VALUE,
  SUPPORTED_SCOPES,
} from "./constants.js";
import {
  isPermittedRedirectUri,
  matchRedirectUri,
} from "./matchRedirectUri.js";
import {
  ClientMetadataError,
  ClientMetadataErrorReason,
  resolveClientMetadata,
  type ClientMetadata,
} from "./resolveClientMetadata.js";
import { isMcpResource } from "./resource.js";

export type AuthorizationRequestParameters = Readonly<
  Record<string, string | string[] | undefined>
>;

export enum AuthorizationRequestValidationKind {
  Valid = "valid",
  /**
   * The client or its redirect URI is not valid. The server must not
   * redirect (RFC 6749 section 4.1.2.1): it shows the error to the user.
   */
  ClientError = "client_error",
  /** The server sends the error to the redirect URI of the client */
  RedirectError = "redirect_error",
}

export enum AuthorizationClientErrorReason {
  InvalidClientId = "invalid_client_id",
  ClientMetadataUnavailable = "client_metadata_unavailable",
  InvalidClientMetadata = "invalid_client_metadata",
  /** Missing, not registered in the document, or with a refused scheme */
  InvalidRedirectUri = "invalid_redirect_uri",
}

/** The error codes of RFC 6749 section 4.1.2.1 and RFC 8707 section 2 */
export enum AuthorizationErrorCode {
  InvalidRequest = "invalid_request",
  AccessDenied = "access_denied",
  UnsupportedResponseType = "unsupported_response_type",
  InvalidScope = "invalid_scope",
  InvalidTarget = "invalid_target",
}

const GRANTED_SCOPE = MCP_SCOPE;

const MAX_STATE_LENGTH = 512;

const urlParameterSchema = z.string().min(1).max(MAX_URL_LENGTH);

/**
 * A parameter that the request repeats is an array, thus it is not valid (RFC
 * 6749 section 3.1)
 */
export const authorizationRequestSchema = z.object({
  code_challenge: z.string().regex(PKCE_VALUE),
  code_challenge_method: z.literal("S256"),
  scope: z.string().max(1000).optional(),
  resource: urlParameterSchema.optional(),
});

export type AuthorizationRequestValidation =
  | {
      readonly kind: AuthorizationRequestValidationKind.Valid;
      readonly client: ClientMetadata;
      /** With the port of the request for a loopback URI */
      readonly redirectUri: string;
      readonly codeChallenge: string;
      readonly state: string | undefined;
      readonly scope: string;
      readonly resource: string;
    }
  | {
      readonly kind: AuthorizationRequestValidationKind.ClientError;
      readonly reason: AuthorizationClientErrorReason;
      /** A short English message without internal data */
      readonly message: string;
    }
  | {
      readonly kind: AuthorizationRequestValidationKind.RedirectError;
      readonly redirectUri: string;
      readonly error: AuthorizationErrorCode;
      readonly description: string;
      readonly state: string | undefined;
    };

const toClientErrorReason = (reason: ClientMetadataErrorReason) => {
  switch (reason) {
    case ClientMetadataErrorReason.InvalidClientId:
      return AuthorizationClientErrorReason.InvalidClientId;
    case ClientMetadataErrorReason.DocumentUnavailable:
      return AuthorizationClientErrorReason.ClientMetadataUnavailable;
    case ClientMetadataErrorReason.InvalidDocument:
      return AuthorizationClientErrorReason.InvalidClientMetadata;
    default:
      throw new Error(`Unknown reason: ${reason satisfies never}`);
  }
};

/**
 * The consent page calls it before it shows the consent, and the approve and
 * deny actions call it again with the parameters of the form
 */
export const validateAuthorizationRequest = async (
  context: ApplicationContext,
  parameters: AuthorizationRequestParameters,
): Promise<AuthorizationRequestValidation> => {
  const clientId = urlParameterSchema.safeParse(parameters.client_id);
  if (!clientId.success)
    return {
      kind: AuthorizationRequestValidationKind.ClientError,
      reason: AuthorizationClientErrorReason.InvalidClientId,
      message: "The client_id parameter is missing or not valid",
    };

  const requestedRedirectUri = urlParameterSchema.safeParse(
    parameters.redirect_uri,
  );
  if (!requestedRedirectUri.success)
    return {
      kind: AuthorizationRequestValidationKind.ClientError,
      reason: AuthorizationClientErrorReason.InvalidRedirectUri,
      message: "The redirect_uri parameter is missing or not valid",
    };

  let client: ClientMetadata;
  try {
    client = await resolveClientMetadata(context, { clientId: clientId.data });
  } catch (error) {
    if (!(error instanceof ClientMetadataError)) throw error;

    return {
      kind: AuthorizationRequestValidationKind.ClientError,
      reason: toClientErrorReason(error.reason),
      message: error.message,
    };
  }

  const redirectUri = requestedRedirectUri.data;
  if (
    !matchRedirectUri(client.redirectUris, redirectUri) ||
    !isPermittedRedirectUri(redirectUri)
  )
    return {
      kind: AuthorizationRequestValidationKind.ClientError,
      reason: AuthorizationClientErrorReason.InvalidRedirectUri,
      message: "The client does not permit this redirect URI",
    };

  const redirectError = (
    error: AuthorizationErrorCode,
    description: string,
    state: string | undefined,
  ): AuthorizationRequestValidation => ({
    kind: AuthorizationRequestValidationKind.RedirectError,
    redirectUri,
    error,
    description,
    state,
  });

  const state = z
    .string()
    .max(MAX_STATE_LENGTH)
    .optional()
    .safeParse(parameters.state);
  // A state that is not valid does not go back to the client
  if (!state.success)
    return redirectError(
      AuthorizationErrorCode.InvalidRequest,
      "The state parameter is not valid",
      undefined,
    );

  if (typeof parameters.response_type !== "string")
    return redirectError(
      AuthorizationErrorCode.InvalidRequest,
      "The response_type parameter is missing or repeated",
      state.data,
    );

  if (parameters.response_type !== "code")
    return redirectError(
      AuthorizationErrorCode.UnsupportedResponseType,
      "Only the response type code is supported",
      state.data,
    );

  const request = authorizationRequestSchema.safeParse(parameters);
  if (!request.success)
    return redirectError(
      AuthorizationErrorCode.InvalidRequest,
      `The ${request.error.issues[0]?.path.join(".")} parameter is missing or not valid`,
      state.data,
    );

  const requestedScopes = request.data.scope?.split(" ").filter(Boolean) ?? [];
  if (requestedScopes.some((scope) => !SUPPORTED_SCOPES.includes(scope)))
    return redirectError(
      AuthorizationErrorCode.InvalidScope,
      `The supported scopes are: ${SUPPORTED_SCOPES.join(" ")}`,
      state.data,
    );

  if (
    request.data.resource !== undefined &&
    !isMcpResource(context, request.data.resource)
  )
    return redirectError(
      AuthorizationErrorCode.InvalidTarget,
      "The resource is not the MCP server of this authorization server",
      state.data,
    );

  return {
    kind: AuthorizationRequestValidationKind.Valid,
    client,
    redirectUri,
    codeChallenge: request.data.code_challenge,
    state: state.data,
    scope: GRANTED_SCOPE,
    resource: context.urls.mcpResourceUrl.href,
  };
};

/**
 * Call it only with a redirect URI that `validateAuthorizationRequest()`
 * accepted. `iss` tells the client which server answers (RFC 9207).
 */
export const buildAuthorizationResponseUrl = (
  context: Pick<ApplicationContext, "urls">,
  redirectUri: string,
  parameters: Readonly<Record<string, string | undefined>>,
) => {
  const url = new URL(redirectUri);

  for (const [name, value] of Object.entries(parameters))
    if (value !== undefined) url.searchParams.set(name, value);

  url.searchParams.set("iss", context.urls.issuer);

  return url.href;
};
