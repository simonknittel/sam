import { KeySetUnavailableError, type Logger } from "@sam-monorepo/application";
import { connectionTokenSchema } from "@sam-monorepo/domain";
import {
  RELAY_INTERNAL_PATHS,
  RelayInternalOperation,
  RelayInternalRequestTokenError,
  verifyRelayInternalRequestToken,
} from "@sam-monorepo/infrastructure";
import type { JWTVerifyGetKey } from "jose";
import type { IncomingMessage, ServerResponse } from "node:http";

const HEALTH_PATH = "/health";

const BEARER_PREFIX = "Bearer ";

/** Only for the parse of the path */
const PATH_BASE_URL = "http://localhost";

/** The path of the request. Undefined when the request has no valid URL. */
export const getRequestPath = (request: IncomingMessage) =>
  URL.parse(request.url ?? "", PATH_BASE_URL)?.pathname;

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
  /** The log of the refused requests, which clients without a valid token can cause */
  readonly throttledLog: Logger;
  /** The JSON Web Key Set of the app */
  readonly keySet: JWTVerifyGetKey;
  /** The issuer of the tokens of the app (`urls.issuer` of the context) */
  readonly issuer: string;
  /** False while the relay service stops or when the database does not answer */
  readonly isHealthy: () => Promise<boolean>;
  /** Closes the runtime connections of the user with `access_denied` */
  readonly disconnectUser: (userId: string) => void;
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
 * The internal requests have no body (see `createRelayClient()` of
 * `infrastructure`). The relay service never reads a body.
 */
const hasBody = (request: IncomingMessage) =>
  request.headers["transfer-encoding"] !== undefined ||
  Number(request.headers["content-length"] ?? 0) > 0;

const readBearerToken = (request: IncomingMessage) => {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith(BEARER_PREFIX)) return null;

  const token = connectionTokenSchema.safeParse(
    authorization.slice(BEARER_PREFIX.length),
  );
  return token.success ? token.data : null;
};

/**
 * The HTTP endpoints of the relay service next to the WebSocket endpoint:
 *
 * - `GET /health`: 200 when the server runs and the database answers, else
 *   503. The body has no details.
 * - The internal endpoints of the app (`RELAY_INTERNAL_PATHS`): `POST`
 *   with a short-lived ES256 token of the app for the operation of the
 *   endpoint (`verifyRelayInternalRequestToken()`) and without a body. 401
 *   without a valid token, 503 when the key set of the app cannot be read,
 *   413 with a body, 204 after the operation.
 */
export const createHttpRequestHandler = ({
  log,
  throttledLog,
  keySet,
  issuer,
  isHealthy,
  disconnectUser,
}: HttpEndpointOptions) => {
  const handleInternalRequest = async (
    request: IncomingMessage,
    response: ServerResponse,
    operation: RelayInternalOperation,
  ) => {
    // The answers before the end of the operation close the connection: the relay service does not read a body
    const token = readBearerToken(request);
    if (token === null) {
      respond(response, HttpStatus.Unauthorized, { connection: "close" });
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
      if (error instanceof KeySetUnavailableError) {
        log.error("The key set of the app cannot be read", {
          operation,
          error,
        });
        respond(response, HttpStatus.ServiceUnavailable, {
          connection: "close",
        });
        return;
      }
      if (!(error instanceof RelayInternalRequestTokenError)) throw error;

      throttledLog.warn(
        "Refused an internal request with a token that is not valid",
        {
          operation,
        },
      );
      respond(response, HttpStatus.Unauthorized, { connection: "close" });
      return;
    }

    if (hasBody(request)) {
      respond(response, HttpStatus.ContentTooLarge, { connection: "close" });
      return;
    }

    switch (internalRequest.operation) {
      case RelayInternalOperation.DisconnectUser:
        disconnectUser(internalRequest.userId);
        break;

      default:
        throw new Error(
          `Unknown relay operation: ${internalRequest.operation satisfies never}`,
        );
    }

    respond(response, HttpStatus.NoContent);
  };

  const routeRequest = async (
    request: IncomingMessage,
    response: ServerResponse,
  ) => {
    const path = getRequestPath(request);
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
