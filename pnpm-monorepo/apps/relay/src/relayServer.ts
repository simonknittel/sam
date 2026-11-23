import {
  getRuntimeStopOfOwner,
  type ApplicationContext,
} from "@sam-monorepo/application";
import {
  RELAY_LIMITS,
  RelayCloseReason,
  type RemoteControlProgramSwitches,
} from "@sam-monorepo/domain";
import type { JWTVerifyGetKey } from "jose";
import { once } from "node:events";
import {
  createServer,
  STATUS_CODES,
  type IncomingMessage,
  type Server,
} from "node:http";
import type { AddressInfo } from "node:net";
import type { Duplex } from "node:stream";
import { WebSocketServer } from "ws";
import type { FeedEntryDelivery } from "./delivery/index.js";
import { createHttpRequestHandler, getRequestPath } from "./httpEndpoints.js";
import { createThrottledLogger } from "./logger.js";
import { createRelayMetrics } from "./metrics.js";
import { OwnerRateLimits, type Rate } from "./rateLimits.js";
import {
  DEFAULT_RELAY_TIMING,
  RelayConnection,
  type ConnectionHub,
  type RelayTiming,
} from "./relayConnection.js";
import type { SwitchesSource } from "./switches.js";

/** The path of the WebSocket endpoint of the runtimes */
const WEB_SOCKET_PATH = "/";

/** Bounds a refused `Origin` in the logs */
const MAXIMUM_LOGGED_ORIGIN_LENGTH = 256;

/**
 * The sockets before the `welcome`. A correct runtime is in this phase for
 * less than one second, also when all runtimes connect again after a restart
 * of the relay service (each after a random delay). Each socket can hold a
 * message of up to `RELAY_LIMITS.maximumMessageBytes`, thus the sockets
 * without a valid `hello` hold a maximum of 100 MB. The relay service does
 * not limit the connections for each address: the proxy does it (see
 * docs/setup-test-and-production.md#10-set-up-the-relay-service-of-the-remote-control-program).
 */
const DEFAULT_MAXIMUM_UNAUTHENTICATED_SOCKETS = 200;

/**
 * The time for the headers and for the full HTTP request. The WebSocket
 * upgrades and the internal requests have no body.
 */
const HTTP_REQUEST_TIMEOUT_MILLISECONDS = 10_000;

/** Node.js applies the HTTP time limits at this interval (default: 30 seconds) */
const HTTP_TIMEOUT_CHECK_INTERVAL_MILLISECONDS = 1_000;

/**
 * The health check queries the database a maximum of once in this time, also
 * when many requests arrive
 */
const HEALTH_CHECK_MAXIMUM_AGE_MILLISECONDS = 5_000;

/**
 * The log records that clients without a valid token can cause (see
 * `throttledLog` of `ConnectionHub`): 20 at once, then 10 in each minute.
 * The metrics count each refused `hello` and each close.
 */
const THROTTLED_LOG_RATE: Rate = { intervalMilliseconds: 6_000, burstSize: 20 };

/**
 * The relay service keeps the ids of the disconnected users for this time.
 * The handshake of a connection can read the user before the ban, and
 * finish after the disconnect. After this time, each connection of the user
 * checked the ban again in the database: at its `hello`, or at its
 * `token_renewal` before the end of the grace time of its token.
 */
const DISCONNECTED_USER_MEMORY_MILLISECONDS =
  RELAY_LIMITS.connectionTokenLifetimeMilliseconds +
  RELAY_LIMITS.tokenRenewalGraceMilliseconds;

export interface RelayServerOptions {
  readonly context: ApplicationContext;
  readonly delivery: FeedEntryDelivery;
  readonly switches: SwitchesSource;
  /** The JSON Web Key Set of the app, for the tokens of the internal requests */
  readonly keySet: JWTVerifyGetKey;
  readonly isDatabaseAvailable: () => Promise<boolean>;
  /**
   * The origin of the pages of the app (`APP_ORIGIN`, by default the origin
   * of `APP_BASE_URL`): the only permitted `Origin` of a browser connection
   */
  readonly appOrigin: string;
  /** The tests make the times shorter */
  readonly timing?: Partial<RelayTiming>;
  /** The sockets before the `welcome`. The tests make it smaller. */
  readonly maximumUnauthenticatedSockets?: number;
}

export interface RelayServer {
  /** Gives the port, also for the port 0 */
  readonly listen: (port: number) => Promise<number>;
  /**
   * The controlled close: stops the new connections, closes each connection
   * with `relay_service_restart`, and waits until the relay service wrote
   * the upload counts and ended the leases
   */
  readonly close: () => Promise<void>;
}

const refuseUpgrade = (socket: Duplex, status: number) => {
  socket.end(
    `HTTP/1.1 ${status} ${STATUS_CODES[status]}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`,
  );
};

/**
 * The server of the relay service: the WebSocket endpoint of the runtimes at
 * `/`, the health check and the internal endpoints of the app on one port.
 * One instance: the connections are in memory, and the presence and the
 * stop are in the database.
 */
export const createRelayServer = ({
  context,
  delivery,
  switches,
  keySet,
  isDatabaseAvailable,
  appOrigin,
  timing: timingOverrides,
  maximumUnauthenticatedSockets = DEFAULT_MAXIMUM_UNAUTHENTICATED_SOCKETS,
}: RelayServerOptions): RelayServer => {
  const { log } = context;
  const timing = { ...DEFAULT_RELAY_TIMING, ...timingOverrides };
  const metrics = createRelayMetrics();
  const throttledLog = createThrottledLogger(log, THROTTLED_LOG_RATE);
  /** The connections that can get messages: before their close */
  const liveConnections = new Set<RelayConnection>();
  /** The live connections before their `welcome` */
  const unauthenticatedConnections = new Set<RelayConnection>();
  /** The connections before the end of their cleanup */
  const unfinishedConnections = new Set<RelayConnection>();
  /** The open connection of each runtime of each owner */
  const openConnectionsByRuntime = new Map<string, RelayConnection>();
  /** The time until which the relay service keeps the id of each disconnected user */
  const disconnectedUsers = new Map<string, number>();
  const rateLimits = new OwnerRateLimits();
  let ownerStopChangeCount = 0;
  let isClosing = false;
  let checkInterval: ReturnType<typeof setInterval> | undefined;
  let unsubscribeFromSwitches: (() => void) | undefined;

  const getRuntimeKey = (connection: RelayConnection) =>
    JSON.stringify([connection.ownerCitizenId, connection.runtimeId]);

  const isUserDisconnected = (userId: string) =>
    (disconnectedUsers.get(userId) ?? 0) > Date.now();

  const hub: ConnectionHub = {
    context,
    metrics,
    delivery,
    switches,
    timing,
    rateLimits,
    throttledLog,
    isUserDisconnected,
    getOwnerStopChangeCount: () => ownerStopChangeCount,
    registerOpenConnection: (connection) => {
      unauthenticatedConnections.delete(connection);
      const key = getRuntimeKey(connection);
      const previousConnection = openConnectionsByRuntime.get(key);
      openConnectionsByRuntime.set(key, connection);
      return previousConnection;
    },
    removeConnection: (connection) => {
      liveConnections.delete(connection);
      unauthenticatedConnections.delete(connection);
      const key = getRuntimeKey(connection);
      if (openConnectionsByRuntime.get(key) === connection)
        openConnectionsByRuntime.delete(key);
    },
  };

  /**
   * Closes the connections of the user, also the connections in their
   * handshake (see `isUserDisconnected()`)
   */
  const disconnectUser = (userId: string) => {
    disconnectedUsers.set(
      userId,
      Date.now() + DISCONNECTED_USER_MEMORY_MILLISECONDS,
    );
    const userConnections = [...liveConnections].filter(
      (connection) => connection.userId === userId,
    );
    for (const connection of userConnections)
      connection.close(RelayCloseReason.AccessDenied);

    log.info("Closed the runtime connections of a user for the app", {
      userId,
      connectionCount: userConnections.length,
    });
  };

  const findOpenConnectionsOfOwner = (ownerCitizenId: string) =>
    [...liveConnections].filter(
      (connection) =>
        connection.isOpen && connection.ownerCitizenId === ownerCitizenId,
    );

  /**
   * Each connection of the owner gets the current stop. A connection in its
   * handshake reads the stop again after its `welcome` (see
   * `getOwnerStopChangeCount()`).
   */
  const applyOwnerStopChange = async (ownerCitizenId: string) => {
    ownerStopChangeCount += 1;
    if (findOpenConnectionsOfOwner(ownerCitizenId).length === 0) return;

    const { stoppedAt } = await getRuntimeStopOfOwner(context, {
      ownerCitizenId,
    });
    const ownerConnections = findOpenConnectionsOfOwner(ownerCitizenId);
    for (const connection of ownerConnections)
      connection.sendOwnerStop(stoppedAt !== null);

    log.info("Sent the changed stop of an owner to the runtimes", {
      ownerCitizenId,
      isStopped: stoppedAt !== null,
      connectionCount: ownerConnections.length,
    });
  };

  const handleSwitchesChange = (
    changedSwitches: RemoteControlProgramSwitches,
  ) => {
    for (const connection of [...liveConnections])
      if (changedSwitches.isProgramTurnedOff)
        connection.close(RelayCloseReason.ProgramTurnedOff);
      else connection.sendSwitches(changedSwitches);
  };

  const webSocketServer = new WebSocketServer({
    noServer: true,
    // A larger message closes the connection with the close code 1009
    maxPayload: RELAY_LIMITS.maximumMessageBytes,
  });

  let databaseCheck: {
    readonly startedAt: number;
    readonly isAvailable: Promise<boolean>;
  } | null = null;
  const isDatabaseAvailableCached = () => {
    const now = Date.now();
    if (
      databaseCheck === null ||
      now - databaseCheck.startedAt >= HEALTH_CHECK_MAXIMUM_AGE_MILLISECONDS
    )
      databaseCheck = { startedAt: now, isAvailable: isDatabaseAvailable() };

    return databaseCheck.isAvailable;
  };

  const httpServer: Server = createServer(
    {
      headersTimeout: HTTP_REQUEST_TIMEOUT_MILLISECONDS,
      requestTimeout: HTTP_REQUEST_TIMEOUT_MILLISECONDS,
      connectionsCheckingInterval: HTTP_TIMEOUT_CHECK_INTERVAL_MILLISECONDS,
    },
    createHttpRequestHandler({
      log,
      throttledLog,
      keySet,
      issuer: context.urls.issuer,
      isHealthy: async () => !isClosing && (await isDatabaseAvailableCached()),
      disconnectUser,
      applyOwnerStopChange,
    }),
  );

  /**
   * A browser always sends its `Origin`, thus a page of a different site
   * cannot use the session of the app through a connection token of the
   * page. The desktop companion (step 3) sends no `Origin`.
   */
  httpServer.on(
    "upgrade",
    (request: IncomingMessage, socket: Duplex, head: Buffer) => {
      // A reset of the connection before the upgrade must not stop the process
      socket.on("error", () => undefined);

      if (isClosing) {
        refuseUpgrade(socket, 503);
        return;
      }

      if (getRequestPath(request) !== WEB_SOCKET_PATH) {
        refuseUpgrade(socket, 404);
        return;
      }

      const origin = request.headers.origin;
      if (origin !== undefined && origin !== appOrigin) {
        throttledLog.warn(
          "Refused a WebSocket connection of a different origin",
          {
            origin: origin.slice(0, MAXIMUM_LOGGED_ORIGIN_LENGTH),
          },
        );
        refuseUpgrade(socket, 403);
        return;
      }

      // The runtime connects again after its delay
      if (unauthenticatedConnections.size >= maximumUnauthenticatedSockets) {
        throttledLog.warn(
          "Refused a WebSocket connection: too many connections wait for their welcome",
          { connectionCount: unauthenticatedConnections.size },
        );
        refuseUpgrade(socket, 503);
        return;
      }

      webSocketServer.handleUpgrade(request, socket, head, (webSocket) => {
        const connection = new RelayConnection(webSocket, hub);
        liveConnections.add(connection);
        unauthenticatedConnections.add(connection);
        unfinishedConnections.add(connection);
        void connection.finished.then(() =>
          unfinishedConnections.delete(connection),
        );

        if (isClosing) connection.close(RelayCloseReason.RelayServiceRestart);
      });
    },
  );

  let closing: Promise<void> | undefined;

  const closeServer = async () => {
    isClosing = true;
    clearInterval(checkInterval);
    unsubscribeFromSwitches?.();

    const httpServerClosed = httpServer.listening
      ? new Promise<void>((resolve) => httpServer.close(() => resolve()))
      : Promise.resolve();
    httpServer.closeIdleConnections();

    for (const connection of [...liveConnections])
      connection.close(RelayCloseReason.RelayServiceRestart);
    await Promise.all(
      [...unfinishedConnections].map((connection) => connection.finished),
    );

    // The runtimes have the `close` message. The relay service does not wait for the close handshake of each socket.
    for (const webSocket of webSocketServer.clients) webSocket.terminate();
    webSocketServer.close();
    httpServer.closeAllConnections();
    await httpServerClosed;
  };

  return {
    listen: async (port) => {
      httpServer.listen(port);
      await once(httpServer, "listening");

      unsubscribeFromSwitches = switches.subscribe(handleSwitchesChange);
      checkInterval = setInterval(() => {
        const now = Date.now();
        for (const connection of [...liveConnections]) connection.check(now);
        rateLimits.removeIdle(now);
        for (const [userId, expiresAt] of disconnectedUsers)
          if (expiresAt <= now) disconnectedUsers.delete(userId);
      }, timing.connectionCheckIntervalMilliseconds);

      return (httpServer.address() as AddressInfo).port;
    },
    close: () => {
      closing ??= closeServer();
      return closing;
    },
  };
};
