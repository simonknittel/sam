import {
  getApplicationContext,
  isApplicationError,
  mapApplicationErrorToRouteResponse,
  toActor,
} from "@/modules/application";
import { requireAuthenticationApi } from "@/modules/auth/server";
import apiErrorHandler from "@/modules/common/utils/apiErrorHandler";
import {
  authenticateDesktopCompanion,
  InvalidTokenError,
  issueDesktopCompanionConnectionToken,
  issueRuntimeConnectionToken,
  issueRuntimeConnectionTokenInputSchema,
  SigningKeyUnavailableError,
  type IssueRuntimeConnectionTokenOutput,
} from "@sam-monorepo/application";
import {
  REMOTE_CONTROL_PROGRAM_PROTECTED_RESOURCE_METADATA_PATH,
  RUNTIME_CONNECTION_TOKEN_PATH,
} from "@sam-monorepo/domain";
import { NextResponse } from "next/server";

/** RFC 6750 section 2.1. The scheme is case-insensitive (RFC 9110). */
const BEARER_TOKEN = /^Bearer ([A-Za-z0-9\-._~+/]+=*)$/i;

const readBody = async (request: Request) => {
  const body: unknown = await request.json().catch(() => null);

  return issueRuntimeConnectionTokenInputSchema.parse(body);
};

const tokenResponse = ({
  token,
  expiresAt,
  relayUrl,
  citizenId,
  handle,
}: IssueRuntimeConnectionTokenOutput) =>
  NextResponse.json(
    {
      token,
      expires_at: expiresAt.toISOString(),
      relay_url: relayUrl,
      citizen_id: citizenId,
      handle,
    },
    { headers: { "cache-control": "no-store" } },
  );

/** RFC 6750 section 3 with the metadata URL of RFC 9728 section 5.1 */
const bearerChallengeResponse = (
  error: "invalid_request" | "invalid_token",
  status: number,
) =>
  NextResponse.json(
    { error },
    {
      status,
      headers: {
        "cache-control": "no-store",
        "www-authenticate": `Bearer error="${error}", resource_metadata="${
          new URL(
            REMOTE_CONTROL_PROGRAM_PROTECTED_RESOURCE_METADATA_PATH,
            getApplicationContext().urls.baseUrl,
          ).href
        }"`,
      },
    },
  );

/** The desktop companion: an access token of the Remote Control Program */
const handleAccessTokenRequest = async (
  request: Request,
  authorization: string,
) => {
  const accessToken = BEARER_TOKEN.exec(authorization)?.[1];
  if (!accessToken) return bearerChallengeResponse("invalid_request", 400);

  try {
    const context = getApplicationContext();
    // The token before the body: a request without a valid token gets 401
    const principal = await authenticateDesktopCompanion(context, accessToken);

    return tokenResponse(
      await issueDesktopCompanionConnectionToken(
        context,
        principal,
        await readBody(request),
      ),
    );
  } catch (error) {
    if (error instanceof InvalidTokenError)
      return bearerChallengeResponse("invalid_token", 401);

    if (error instanceof SigningKeyUnavailableError)
      return NextResponse.json(
        { error: "temporarily_unavailable" },
        { status: 503, headers: { "cache-control": "no-store" } },
      );

    throw error;
  }
};

/** The browser runtime: the session of the app */
const handleSessionRequest = async (request: Request) => {
  const authentication = await requireAuthenticationApi(
    RUNTIME_CONNECTION_TOKEN_PATH,
    "POST",
  );

  return tokenResponse(
    await issueRuntimeConnectionToken(
      getApplicationContext(),
      await toActor(authentication.session),
      await readBody(request),
    ),
  );
};

/**
 * A short-lived token for one connection of a runtime to the relay service
 * of the Remote Control Program. The runtime gets a token for each
 * connection and for each renewal. The body, the answer and the status codes
 * are in "Connection and tokens" of `docs/remote-control-program/README.md`.
 * A route handler and not a server action: its URL stays the same after a
 * deploy, thus a runtime that is open during a deploy continues to get
 * tokens.
 *
 * - With an `Authorization` header: only the Bearer access token of the
 *   desktop companion, never the session.
 * - Else the session of the browser runtime. 403 also for an admin who
 *   assumes a user (see `issueRuntimeConnectionToken()`).
 */
export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization");
    if (authorization !== null)
      return await handleAccessTokenRequest(request, authorization);

    return await handleSessionRequest(request);
  } catch (error) {
    if (isApplicationError(error))
      return mapApplicationErrorToRouteResponse(error);

    return apiErrorHandler(error);
  }
}
