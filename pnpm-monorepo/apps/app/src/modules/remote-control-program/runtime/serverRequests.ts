import { connectionTokenSchema, RelayCloseReason } from "@sam-monorepo/domain";
import {
  CHANNEL_CLIENT_LIMITS,
  ChannelEndReason,
  ConnectionTokenRefusedError,
  type ConnectionTokenGrant,
} from "@sam-monorepo/remote-control-program-runtime";
import { decodeJwt } from "jose";
import * as z from "zod";

/**
 * The token request uses a route handler and not a server action: the URL of
 * a route stays the same after a deploy, thus a tab that is open during a
 * deploy continues to work. A server action also goes through the action
 * queue of the router.
 */
const CONNECTION_TOKEN_PATH = "/api/remote-control-program/connection-token";

/** Longer than a `wss://` URL of a host */
const MAXIMUM_RELAY_URL_LENGTH = 2_048;

/** Far above the length of a citizen id */
const MAXIMUM_CITIZEN_ID_LENGTH = 100;

const connectionTokenResponseSchema = z.object({
  token: connectionTokenSchema,
  relay_url: z
    .url({ protocol: /^wss?$/ })
    .max(MAXIMUM_RELAY_URL_LENGTH)
    .nullable(),
});

/**
 * The claim of the token that the runtime reads (see
 * `signRuntimeConnectionToken()` of the application package)
 */
const connectionTokenClaimsSchema = z.object({
  citizen_id: z.string().max(MAXIMUM_CITIZEN_ID_LENGTH),
});

/**
 * The token source of the channel client: a token for one connection of the
 * runtime, and the URL of the relay. It throws `ConnectionTokenRefusedError`
 * for a 401 of the route (the session ended), for a 403 (for example without
 * `remoteControlProgram;use`, after a ban, or in an assumed session), and for
 * a token of a different citizen.
 */
export const requestConnectionToken = async (
  runtimeId: string,
  citizenId: string,
  signal: AbortSignal,
): Promise<ConnectionTokenGrant> => {
  const response = await fetch(
    new URL(CONNECTION_TOKEN_PATH, window.location.origin),
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ runtime_id: runtimeId }),
      cache: "no-store",
      signal: AbortSignal.any([
        signal,
        AbortSignal.timeout(
          CHANNEL_CLIENT_LIMITS.tokenRequestTimeoutMilliseconds,
        ),
      ]),
    },
  );

  if (response.status === 401)
    throw new ConnectionTokenRefusedError(ChannelEndReason.SessionExpired);
  if (response.status === 403)
    throw new ConnectionTokenRefusedError(RelayCloseReason.AccessDenied);
  if (!response.ok)
    throw new Error(`The token route answered with ${response.status}`);

  const body = connectionTokenResponseSchema.parse(await response.json());

  // A login with a different account in a different tab changes the session
  // of all tabs. The runtime of this page must not upload as that citizen.
  const claims = connectionTokenClaimsSchema.parse(decodeJwt(body.token));
  if (claims.citizen_id !== citizenId)
    throw new ConnectionTokenRefusedError(ChannelEndReason.CitizenChanged);

  return {
    token: body.token,
    relayUrl: body.relay_url === null ? null : new URL(body.relay_url),
  };
};
