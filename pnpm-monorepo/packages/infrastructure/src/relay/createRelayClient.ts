import type {
  ApplicationContext,
  RelayService,
} from "@sam-monorepo/application";
import {
  RELAY_INTERNAL_PATHS,
  RelayInternalOperation,
  signRelayInternalRequestToken,
  type RelayInternalRequest,
} from "./relayInternalRequestToken.js";

export interface RelayClientOptions {
  /**
   * The public WebSocket URL of the relay service (`ws:` or `wss:`). The
   * internal endpoints have the same host, with HTTP or HTTPS.
   */
  readonly url: string;
  /** The signing key of the app. Without a key, each request throws. */
  readonly signingKey: ApplicationContext["signingKey"];
  /** The issuer of the tokens: `urls.issuer` of the application context */
  readonly issuer: string;
  /**
   * The maximum time of one request. A ban and a "Stop all" wait for it, and
   * a failure does not undo them.
   */
  readonly requestTimeoutMilliseconds: number;
}

/**
 * The client of the internal endpoints of the relay service of the Remote
 * Control Program (`apps/relay`). Each request carries a short-lived token
 * of the app (see `relayInternalRequestToken.ts`).
 */
export const createRelayClient = ({
  url,
  signingKey,
  issuer,
  requestTimeoutMilliseconds,
}: RelayClientOptions): RelayService => {
  const webSocketUrl = new URL(url);

  /** Throws when the relay service does not accept the request */
  const post = async (request: RelayInternalRequest) => {
    const key = await signingKey();
    if (!key)
      throw new Error(
        "The app has no signing key for the requests to the relay service",
      );

    const token = await signRelayInternalRequestToken({
      signingKey: key,
      issuer,
      request,
    });
    const endpointUrl = new URL(
      RELAY_INTERNAL_PATHS[request.operation],
      webSocketUrl,
    );
    endpointUrl.protocol = endpointUrl.protocol === "ws:" ? "http:" : "https:";

    const response = await fetch(endpointUrl, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(requestTimeoutMilliseconds),
    });
    /**
     * The client uses only the status. It cancels the body, thus the
     * connection does not wait for a read of the body.
     */
    await response.body?.cancel();
    if (!response.ok)
      throw new Error(
        `The relay request ${request.operation} failed with status ${response.status}`,
      );
  };

  return {
    webSocketUrl,
    disconnectUser: (userId) =>
      post({ operation: RelayInternalOperation.DisconnectUser, userId }),
    notifyOwnerStopChanged: (ownerCitizenId) =>
      post({
        operation: RelayInternalOperation.OwnerStopChanged,
        ownerCitizenId,
      }),
  };
};
