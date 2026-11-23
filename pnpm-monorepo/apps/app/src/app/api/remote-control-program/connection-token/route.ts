import {
  getApplicationContext,
  isApplicationError,
  mapApplicationErrorToRouteResponse,
  toActor,
} from "@/modules/application";
import { requireAuthenticationApi } from "@/modules/auth/server";
import apiErrorHandler from "@/modules/common/utils/apiErrorHandler";
import {
  issueRuntimeConnectionToken,
  issueRuntimeConnectionTokenInputSchema,
} from "@sam-monorepo/application";
import { NextResponse } from "next/server";

const ROUTE_PATH = "/api/remote-control-program/connection-token";

/**
 * A short-lived token for one connection of the browser runtime to the relay
 * service of the Remote Control Program, with the URL of the relay service.
 * The runtime gets a token for each connection and for each renewal. A route
 * handler and not a server action: its URL stays the same after a deploy,
 * thus a runtime that is open during a deploy continues to get tokens.
 *
 * Body: `{ "runtime_id": "<uuid>" }`. Answer: `{ "token", "expires_at",
 * "relay_url" }`, with `relay_url` null when the app has no relay service.
 * 403 also for an admin who assumes a user (see
 * `issueRuntimeConnectionToken()`).
 */
export async function POST(request: Request) {
  try {
    const authentication = await requireAuthenticationApi(ROUTE_PATH, "POST");

    const body: unknown = await request.json().catch(() => null);
    const input = issueRuntimeConnectionTokenInputSchema.parse(body);

    const { token, expiresAt, relayUrl } = await issueRuntimeConnectionToken(
      getApplicationContext(),
      await toActor(authentication.session),
      input,
    );

    return NextResponse.json(
      {
        token,
        expires_at: expiresAt.toISOString(),
        relay_url: relayUrl,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    if (isApplicationError(error))
      return mapApplicationErrorToRouteResponse(error);

    return apiErrorHandler(error);
  }
}
