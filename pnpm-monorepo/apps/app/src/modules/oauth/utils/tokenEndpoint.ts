import { log } from "@/modules/logging";
import {
  OAuthTokenError,
  OAuthTokenErrorCode,
  SigningKeyUnavailableError,
} from "@sam-monorepo/application";
import type * as z from "zod";
import {
  temporarilyUnavailableResponse,
  tokenEndpointResponse,
} from "./responses";

/** Token and revocation requests have a few short fields */
const MAX_BODY_LENGTH = 16 * 1024;

const invalidRequest = (description: string) =>
  new OAuthTokenError(OAuthTokenErrorCode.InvalidRequest, description);

/**
 * Reads the form body of a token or revocation request (RFC 6749 section
 * 3.2). A repeated parameter is not valid (RFC 6749 section 3.1).
 *
 * @throws OAuthTokenError with `invalid_request`
 */
export const readTokenEndpointForm = async (request: Request) => {
  const mediaType = request.headers
    .get("content-type")
    ?.split(";")[0]
    ?.trim()
    .toLowerCase();
  if (mediaType !== "application/x-www-form-urlencoded")
    throw invalidRequest(
      "The body must have the type application/x-www-form-urlencoded",
    );

  const body = await request.text();
  if (body.length > MAX_BODY_LENGTH)
    throw invalidRequest("The body is too large");

  const fields = new Map<string, string>();
  for (const [name, value] of new URLSearchParams(body)) {
    if (fields.has(name))
      throw invalidRequest(`The ${name} parameter is repeated`);

    fields.set(name, value);
  }

  // `Object.fromEntries()` also keeps a field with the name `__proto__` as data
  return Object.fromEntries(fields);
};

export const parseTokenEndpointInput = <Schema extends z.ZodType>(
  schema: Schema,
  fields: Record<string, string>,
): z.infer<Schema> => {
  const result = schema.safeParse(fields);
  if (!result.success)
    throw invalidRequest(
      `The ${result.error.issues[0]?.path.join(".")} parameter is missing or not valid`,
    );

  return result.data;
};

/** Never logs the request body: it contains tokens */
export const toTokenEndpointErrorResponse = (
  error: unknown,
  endpoint: string,
) => {
  if (error instanceof OAuthTokenError)
    return tokenEndpointResponse(
      { error: error.error, error_description: error.description },
      error.error === OAuthTokenErrorCode.InvalidClient ? 401 : 400,
    );

  if (error instanceof SigningKeyUnavailableError)
    return temporarilyUnavailableResponse();

  log.error("Failed to handle an OAuth request", { endpoint, error });
  return tokenEndpointResponse({ error: "server_error" }, 500);
};
