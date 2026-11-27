import {
  createActor,
  issueRuntimeConnectionToken,
  type ApplicationContext,
  type LogArguments,
  type Logger,
  type SigningKey,
} from "@sam-monorepo/application";
import {
  DownMessageType,
  transformPermissionStringToPermissionSet,
} from "@sam-monorepo/domain";
import { createRelayClient } from "@sam-monorepo/infrastructure";
import { once } from "node:events";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createTestSigningKey } from "../../../packages/application/test/signingKey.js";
import { createRelayApplicationContext } from "../src/applicationContext.js";
import type { FeedEntryDelivery } from "../src/delivery/index.js";
import { parseRelayEnvironment } from "../src/env.js";
import { createProgramSwitch } from "../src/programSwitch.js";
import type { RelayTiming } from "../src/relayConnection.js";
import { createRelayServer } from "../src/relayServer.js";
import { OWNER_PERMISSION_STRINGS } from "./database.js";
import { TestRuntimeClient } from "./runtimeClient.js";

/** The app of the tests: the issuer of the tokens and the permitted origin */
export const APP_BASE_URL = "https://sam.example.com";

const REQUEST_TIMEOUT_MILLISECONDS = 5_000;

/**
 * The JSON Web Key Set of the app, like `/.well-known/jwks.json`. A test can
 * make it fail like an app that does not answer correctly.
 */
const startKeySetServer = async (signingKey: SigningKey) => {
  let isAvailable = true;
  const server = createServer((_request, response) => {
    if (!isAvailable) {
      response.writeHead(500);
      response.end();
      return;
    }

    response.writeHead(200, { "content-type": "application/json" });
    response.end(
      JSON.stringify({
        keys: [
          {
            ...signingKey.publicJwk,
            kid: signingKey.keyId,
            alg: signingKey.algorithm,
            use: "sig",
          },
        ],
      }),
    );
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  return {
    server,
    setAvailable: (nextIsAvailable: boolean) => {
      isAvailable = nextIsAvailable;
    },
  };
};

const getUrl = (server: Server, path: string) =>
  new URL(path, `http://127.0.0.1:${(server.address() as AddressInfo).port}`);

/** Records the deliveries instead of the publication to the realtime server */
const createTestDelivery = () => {
  const deliveries: Parameters<FeedEntryDelivery["deliver"]>[0][] = [];

  const delivery: FeedEntryDelivery = {
    deliver: (input) => {
      deliveries.push(input);
    },
    close: async () => undefined,
  };

  return { delivery, deliveries };
};

export interface LogRecord {
  readonly level: keyof Logger;
  readonly message: string;
  readonly args: LogArguments | undefined;
}

interface Owner {
  readonly userId: string;
  readonly citizenId: string;
  readonly handle: string;
}

interface TestRelayOptions {
  readonly timing?: Partial<RelayTiming>;
  readonly maximumUnauthenticatedSockets?: number;
}

/**
 * Starts a relay service with its composition root, the database of the
 * testcontainer, a local key set of the app, a program switch that the test sets and
 * a recording delivery
 */
export const startRelay = async ({
  timing,
  maximumUnauthenticatedSockets,
}: TestRelayOptions = {}) => {
  const signingKey = await createTestSigningKey();
  const keySet = await startKeySetServer(signingKey);
  const programSwitch = createProgramSwitch();
  const { delivery, deliveries } = createTestDelivery();
  const logRecords: LogRecord[] = [];
  const log: Logger = {
    info: (message, args) => logRecords.push({ level: "info", message, args }),
    warn: (message, args) => logRecords.push({ level: "warn", message, args }),
    error: (message, args) =>
      logRecords.push({ level: "error", message, args }),
  };

  const environment = parseRelayEnvironment({
    NODE_ENV: "test",
    DATABASE_URL: process.env.DATABASE_URL,
    APP_BASE_URL,
    APP_JWKS_URL: getUrl(keySet.server, "/.well-known/jwks.json").href,
  });
  const relayContext = createRelayApplicationContext({
    environment,
    log,
    programSwitch,
  });
  const { context } = relayContext;
  const server = createRelayServer({
    context,
    delivery,
    programSwitch,
    keySet: relayContext.keySet,
    isDatabaseAvailable: relayContext.isDatabaseAvailable,
    appOrigin: new URL(APP_BASE_URL).origin,
    timing,
    maximumUnauthenticatedSockets,
  });
  const port = await server.listen(0);
  const relayUrl = `ws://127.0.0.1:${port}`;

  /** The app: it signs the tokens and calls the internal endpoints */
  const createAppContext = (now = new Date()): ApplicationContext => ({
    ...context,
    now: () => new Date(now),
    signingKey: async () => signingKey,
    relay: createRelayClient({
      url: relayUrl,
      signingKey: async () => signingKey,
      issuer: context.urls.issuer,
      requestTimeoutMilliseconds: REQUEST_TIMEOUT_MILLISECONDS,
    }),
  });

  const createOwnerActor = (owner: Owner) =>
    createActor({
      userId: owner.userId,
      userRole: null,
      emailConfirmedAt: new Date(),
      citizen: { id: owner.citizenId, handle: owner.handle },
      roleIds: new Set(),
      discordUserId: null,
      discordTwoFactorEnabled: false,
      permissionSets: OWNER_PERMISSION_STRINGS.map(
        transformPermissionStringToPermissionSet,
      ),
      adminMode: false,
    });

  /** A connection token of the app, with the time of the app at `now` */
  const issueToken = async (owner: Owner, runtimeId: string, now?: Date) =>
    (
      await issueRuntimeConnectionToken(
        createAppContext(now),
        createOwnerActor(owner),
        { runtime_id: runtimeId },
      )
    ).token;

  return {
    relayUrl,
    signingKey,
    /** The log records of the relay service */
    logRecords,
    context,
    deliveries,
    /** Sets the Unleash flag `DisableRemoteControlProgram` (the kill switch) */
    setProgramTurnedOff: (isTurnedOff: boolean) => {
      programSwitch.set(isTurnedOff);
    },
    /** False: the key set of the app answers with an error */
    setKeySetAvailable: keySet.setAvailable,
    createAppContext,
    createOwnerActor,
    issueToken,
    getHttpUrl: (path: string) => new URL(path, `http://127.0.0.1:${port}`),
    openClient: (headers?: Record<string, string>) =>
      TestRuntimeClient.open(relayUrl, headers),
    /** Opens a connection with a new token, and waits for the `welcome` */
    connect: async (owner: Owner, runtimeId: string) => {
      const client = await TestRuntimeClient.open(relayUrl);
      client.sendHello(await issueToken(owner, runtimeId), runtimeId);
      const welcome = await client.waitForMessage(DownMessageType.Welcome);
      return { client, welcome };
    },
    stop: async () => {
      await server.close();
      keySet.server.close();
    },
  };
};

export type TestRelay = Awaited<ReturnType<typeof startRelay>>;
