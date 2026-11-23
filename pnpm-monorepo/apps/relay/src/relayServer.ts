import {
  getOwnRuntimeStop,
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
import { createHttpRequestHandler } from "./httpEndpoints.js";
import { createRelayMetrics } from "./metrics.js";
import {
  DEFAULT_RELAY_TIMING,
  RelayConnection,
  type ConnectionHub,
  type RelayTiming,
} from "./relayConnection.js";
import type { SwitchesSource } from "./switches.js";

/** The path of the WebSocket endpoint of the runtimes */
const WEB_SOCKET_PATH = "/";

/** Only for the parse of the path */
const PATH_BASE_URL = "http://localhost";

/** Bounds a refused `Origin` in the logs */
const MAXIMUM_LOGGED_ORIGIN_LENGTH = 256;

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
}: RelayServerOptions): RelayServer => {
  const { log } = context;
  const timing = { ...DEFAULT_RELAY_TIMING, ...timingOverrides };
  const metrics = createRelayMetrics();
  /** The connections that can get messages: before their close */
  const liveConnections = new Set<RelayConnection>();
  /** The connections before the end of their cleanup */
  const unfinishedConnections = new Set<RelayConnection>();
  /** The open connection of each runtime of each owner */
  const openConnectionsByRuntime = new Map<string, RelayConnection>();
  let ownerStopChangeCount = 0;
  let isClosing = false;
  let checkInterval: ReturnType<typeof setInterval> | undefined;
  let unsubscribeFromSwitches: (() => void) | undefined;

  const getRuntimeKey = (connection: RelayConnection) =>
    JSON.stringify([connection.ownerCitizenId, connection.runtimeId]);

  const hub: ConnectionHub = {
    context,
    metrics,
    delivery,
    switches,
    timing,
    getOwnerStopChangeCount: () => ownerStopChangeCount,
    registerOpenConnection: (connection) => {
      const key = getRuntimeKey(connection);
      const previousConnection = openConnectionsByRuntime.get(key);
      openConnectionsByRuntime.set(key, connection);
      return previousConnection;
    },
    removeConnection: (connection) => {
      liveConnections.delete(connection);
      const key = getRuntimeKey(connection);
      if (openConnectionsByRuntime.get(key) === connection)
        openConnectionsByRuntime.delete(key);
    },
  };

  const disconnectUser = (userId: string) => {
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

    const actor = findOpenConnectionsOfOwner(ownerCitizenId)[0]?.actor;
    if (!actor) return;

    const { stoppedAt } = await getOwnRuntimeStop(context, actor);
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

  const httpServer: Server = createServer(
    createHttpRequestHandler({
      log,
      keySet,
      issuer: context.urls.issuer,
      isHealthy: async () => !isClosing && (await isDatabaseAvailable()),
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

      if (
        URL.parse(request.url ?? "", PATH_BASE_URL)?.pathname !==
        WEB_SOCKET_PATH
      ) {
        refuseUpgrade(socket, 404);
        return;
      }

      const origin = request.headers.origin;
      if (origin !== undefined && origin !== appOrigin) {
        log.warn("Refused a WebSocket connection of a different origin", {
          origin: origin.slice(0, MAXIMUM_LOGGED_ORIGIN_LENGTH),
        });
        refuseUpgrade(socket, 403);
        return;
      }

      webSocketServer.handleUpgrade(request, socket, head, (webSocket) => {
        const connection = new RelayConnection(webSocket, hub);
        liveConnections.add(connection);
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
      }, timing.connectionCheckIntervalMilliseconds);

      return (httpServer.address() as AddressInfo).port;
    },
    close: () => {
      closing ??= closeServer();
      return closing;
    },
  };
};
