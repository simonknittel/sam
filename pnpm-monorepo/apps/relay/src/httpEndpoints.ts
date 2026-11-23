import type { Logger } from "@sam-monorepo/application";
import {
  RELAY_INTERNAL_PATHS,
  RelayInternalOperation,
  RelayInternalRequestTokenError,
  verifyRelayInternalRequestToken,
} from "@sam-monorepo/infrastructure";
import type { JWTVerifyGetKey } from "jose";
import type { IncomingMessage, ServerResponse } from "node:http";

export const HEALTH_PATH = "/health";

/**
 * The internal requests have no body (see `createRelayClient()` of
 * `infrastructure`). The limit stops a large body before the check of the
 * token.
 */
const MAXIMUM_INTERNAL_REQUEST_BODY_BYTES = 1_024;

/** The limit of the connection tokens of the protocol, far above an ES256 token */
const MAXIMUM_TOKEN_LENGTH = 4_096;

const BEARER_PREFIX = "Bearer ";

/** Only for the parse of the path */
const PATH_BASE_URL = "http://localhost";

enum HttpStatus {
  Ok = 200,
  NoContent = 204,
  BadRequest = 400,
  Unauthorized = 401,
  NotFound = 404,
  MethodNotAllowed = 405,
  ContentTooLarge = 413,
  InternalServerError = 500,
  ServiceUnavailable = 503,
}

export interface HttpEndpointOptions {
  readonly log: Logger;
  /** The JSON Web Key Set of the app */
  readonly keySet: JWTVerifyGetKey;
  /** The issuer of the tokens of the app (`urls.issuer` of the context) */
  readonly issuer: string;
  /** False while the relay service stops or when the database does not answer */
  readonly isHealthy: () => Promise<boolean>;
  /** Closes the runtime connections of the user with `access_denied` */
  readonly disconnectUser: (userId: string) => void;
  /** Reads the stop of the owner, and sends `stop` or `start` to the runtimes of the owner */
  readonly applyOwnerStopChange: (ownerCitizenId: string) => Promise<void>;
}

const respond = (
  response: ServerResponse,
  status: HttpStatus,
  headers: Record<string, string> = {},
  body?: object,
) => {
  response.writeHead(status, {
    ...headers,
    ...(body !== undefined && { "content-type": "application/json" }),
  });
  response.end(body === undefined ? undefined : JSON.stringify(body));
};

/**
 * Reads and drops the body. False when the body is larger than the limit:
 * then the request stays paused, and the answer closes the connection.
 */
const discardBody = (request: IncomingMessage, maximumBytes: number) =>
  new Promise<boolean>((resolve, reject) => {
    const contentLength = Number(request.headers["content-length"] ?? 0);
    if (contentLength > maximumBytes) {
      resolve(false);
      return;
    }

    let receivedBytes = 0;
    const onData = (chunk: Buffer) => {
      receivedBytes += chunk.length;
      if (receivedBytes <= maximumBytes) return;

      request.off("data", onData);
      request.pause();
      resolve(false);
    };
    request.on("data", onData);
    request.once("end", () => resolve(true));
    request.once("error", reject);
  });

const readBearerToken = (request: IncomingMessage) => {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith(BEARER_PREFIX)) return null;

  const token = authorization.slice(BEARER_PREFIX.length);
  return token.length > 0 && token.length <= MAXIMUM_TOKEN_LENGTH
    ? token
    : null;
};

/**
 * The HTTP endpoints of the relay service next to the WebSocket endpoint:
 *
 * - `GET /health`: 200 when the server runs and the database answers, else
 *   503. The body has no details.
 * - The internal endpoints of the app (`RELAY_INTERNAL_PATHS`): `POST`
 *   with a short-lived ES256 token of the app for the operation of the
 *   endpoint (`verifyRelayInternalRequestToken()`). 401 without a valid
 *   token, 204 after the operation.
 */
export const createHttpRequestHandler = ({
  log,
  keySet,
  issuer,
  isHealthy,
  disconnectUser,
  applyOwnerStopChange,
}: HttpEndpointOptions) => {
  const handleInternalRequest = async (
    request: IncomingMessage,
    response: ServerResponse,
    operation: RelayInternalOperation,
  ) => {
    if (!(await discardBody(request, MAXIMUM_INTERNAL_REQUEST_BODY_BYTES))) {
      respond(response, HttpStatus.ContentTooLarge, { connection: "close" });
      return;
    }

    const token = readBearerToken(request);
    if (token === null) {
      respond(response, HttpStatus.Unauthorized);
      return;
    }

    let internalRequest;
    try {
      internalRequest = await verifyRelayInternalRequestToken({
        token,
        key: keySet,
        issuer,
        operation,
      });
    } catch (error) {
      if (!(error instanceof RelayInternalRequestTokenError)) throw error;

      log.warn("Refused an internal request with a token that is not valid", {
        operation,
      });
      respond(response, HttpStatus.Unauthorized);
      return;
    }

    switch (internalRequest.operation) {
      case RelayInternalOperation.DisconnectUser:
        disconnectUser(internalRequest.userId);
        break;

      case RelayInternalOperation.OwnerStopChanged:
        await applyOwnerStopChange(internalRequest.ownerCitizenId);
        break;

      default:
        throw new Error(
          `Unknown relay operation: ${JSON.stringify(internalRequest satisfies never)}`,
        );
    }

    respond(response, HttpStatus.NoContent);
  };

  const routeRequest = async (
    request: IncomingMessage,
    response: ServerResponse,
  ) => {
    const path = URL.parse(request.url ?? "", PATH_BASE_URL)?.pathname;
    const internalOperation = Object.values(RelayInternalOperation).find(
      (operation) => RELAY_INTERNAL_PATHS[operation] === path,
    );

    if (path === HEALTH_PATH) {
      if (request.method !== "GET") {
        respond(response, HttpStatus.MethodNotAllowed, { allow: "GET" });
        return;
      }

      const healthy = await isHealthy();
      respond(
        response,
        healthy ? HttpStatus.Ok : HttpStatus.ServiceUnavailable,
        { "cache-control": "no-store" },
        { status: healthy ? "ok" : "unavailable" },
      );
      return;
    }

    if (internalOperation !== undefined) {
      if (request.method !== "POST") {
        respond(response, HttpStatus.MethodNotAllowed, { allow: "POST" });
        return;
      }

      await handleInternalRequest(request, response, internalOperation);
      return;
    }

    respond(
      response,
      path === undefined ? HttpStatus.BadRequest : HttpStatus.NotFound,
    );
  };

  return (request: IncomingMessage, response: ServerResponse) => {
    routeRequest(request, response).catch((error: unknown) => {
      log.error("An HTTP request of the relay service failed", { error });
      if (response.headersSent) response.destroy();
      else respond(response, HttpStatus.InternalServerError);
    });
  };
};
