import { trace } from "@opentelemetry/api";
import {
  createApplicationUrls,
  type ApplicationContext,
  type Logger,
} from "@sam-monorepo/application";
import { prisma } from "@sam-monorepo/database";
import {
  createPrismaAuditWriter,
  createPusherClient,
  createPusherRealtimeServer,
} from "@sam-monorepo/infrastructure";
import {
  createLocalJWKSet,
  createRemoteJWKSet,
  type JWTVerifyGetKey,
} from "jose";
import * as z from "zod";
import type { RelayEnvironment } from "./env.js";
import type { SwitchesSource } from "./switches.js";
import { ONE_MINUTE_MILLISECONDS, resolveWithin } from "./time.js";

/** The maximum time of one request of the key set of the app */
const KEY_SET_REQUEST_TIMEOUT_MILLISECONDS = 5_000;

/**
 * The relay service reads the key set again after this time. A new key of
 * the app is also read at once: an unknown `kid` makes `jose` read the key
 * set again (at most once in `KEY_SET_COOLDOWN_MILLISECONDS`).
 */
const KEY_SET_MAXIMUM_AGE_MILLISECONDS = 10 * ONE_MINUTE_MILLISECONDS;

/** Bounds the requests of the key set when tokens with unknown keys arrive */
const KEY_SET_COOLDOWN_MILLISECONDS = 30_000;

/** Far above the keys of the app: the current key and a key in its rotation */
const MAXIMUM_KEY_SET_KEYS = 16;

/** Far above the members of an EC key of the app */
const MAXIMUM_KEY_MEMBER_LENGTH = 1_024;

const keyMemberSchema = z.string().min(1).max(MAXIMUM_KEY_MEMBER_LENGTH);

/** The members of the keys that the relay service uses. The other members go away. */
const keySetSchema = z.object({
  keys: z
    .array(
      z.object({
        kty: keyMemberSchema,
        kid: keyMemberSchema.optional(),
        alg: keyMemberSchema.optional(),
        use: keyMemberSchema.optional(),
        crv: keyMemberSchema.optional(),
        x: keyMemberSchema.optional(),
        y: keyMemberSchema.optional(),
      }),
    )
    .min(1)
    .max(MAXIMUM_KEY_SET_KEYS),
});

/** The maximum time of one request to the HTTP API of the realtime server */
const REALTIME_REQUEST_TIMEOUT_MILLISECONDS = 5_000;

/** The maximum time of the query of the health check */
const DATABASE_CHECK_TIMEOUT_MILLISECONDS = 2_000;

interface RelayApplicationContextOptions {
  readonly environment: RelayEnvironment;
  readonly log: Logger;
  readonly switches: SwitchesSource;
}

export interface RelayApplicationContext {
  readonly context: ApplicationContext;
  /**
   * The JSON Web Key Set of the app (see `APP_JWKS_BASE64` and
   * `APP_JWKS_URL`). It verifies the connection tokens (the port
   * `connectionTokenVerificationKey`) and the tokens of the internal requests
   * of the app.
   */
  readonly keySet: JWTVerifyGetKey;
  /** True when the database answers a cheap query in time */
  readonly isDatabaseAvailable: () => Promise<boolean>;
  readonly disconnectDatabase: () => Promise<void>;
}

/**
 * The key set from `APP_JWKS_BASE64`, else the key set of the app at
 * `APP_JWKS_URL` or at `/.well-known/jwks.json` of the app
 *
 * @throws Error when `APP_JWKS_BASE64` is not a valid key set
 */
const createKeySet = (environment: RelayEnvironment): JWTVerifyGetKey => {
  if (environment.APP_JWKS_BASE64 !== undefined) {
    let keySet;
    try {
      keySet = keySetSchema.parse(
        JSON.parse(
          Buffer.from(environment.APP_JWKS_BASE64, "base64").toString("utf8"),
        ),
      );
    } catch (error) {
      throw new Error("APP_JWKS_BASE64 is not a valid JSON Web Key Set", {
        cause: error,
      });
    }

    return createLocalJWKSet(keySet);
  }

  return createRemoteJWKSet(
    new URL(
      environment.APP_JWKS_URL ??
        new URL("/.well-known/jwks.json", environment.APP_BASE_URL),
    ),
    {
      timeoutDuration: KEY_SET_REQUEST_TIMEOUT_MILLISECONDS,
      cacheMaxAge: KEY_SET_MAXIMUM_AGE_MILLISECONDS,
      cooldownDuration: KEY_SET_COOLDOWN_MILLISECONDS,
    },
  );
};

const createRealtimeServer = (
  environment: RelayEnvironment,
): ApplicationContext["realtime"] => {
  const {
    PUSHER_CHANNELS_APP_ID: appId,
    PUSHER_CHANNELS_APP_KEY: key,
    PUSHER_CHANNELS_APP_SECRET: secret,
    PUSHER_CHANNELS_HOST: host,
    PUSHER_CHANNELS_PORT: port,
  } = environment;
  if (!appId || !key || !secret || !host || port === undefined) return null;

  return createPusherRealtimeServer({
    client: createPusherClient({
      appId,
      key,
      secret,
      host,
      port,
      useTls: environment.PUSHER_CHANNELS_USE_TLS,
      timeoutMilliseconds: REALTIME_REQUEST_TIMEOUT_MILLISECONDS,
    }),
  });
};

/**
 * The composition root of the relay service: the only module of the relay
 * service that uses the Prisma client (see `boundaries.test.ts`). All other
 * modules call the use cases of `@sam-monorepo/application`. The context has
 * no session: `authenticateRuntimeConnection()` builds the actor of each
 * connection from its token.
 */
export const createRelayApplicationContext = ({
  environment,
  log,
  switches,
}: RelayApplicationContextOptions): RelayApplicationContext => {
  const keySet = createKeySet(environment);

  const context: ApplicationContext = {
    prisma,
    audit: createPrismaAuditWriter({ prisma, log }),
    // The use cases of the relay send no notifications and no emails
    notifications: {
      trigger: async () => {
        log.warn("The relay service sends no notifications");
      },
    },
    email: {
      request: async () => {
        log.warn("The relay service sends no emails");
      },
    },
    log,
    tracer: trace.getTracer("sam-relay"),
    now: () => new Date(),
    changelog: null,
    collab: null,
    realtime: createRealtimeServer(environment),
    discord: null,
    storage: null,
    images: null,
    urls: createApplicationUrls({
      baseUrl: environment.APP_BASE_URL,
      // The relay service shows no uploads. With an empty base, `getPublicUploadUrl()` throws, thus a wrong use fails.
      publicUploadBaseUrl: "",
    }),
    signingKey: async () => null,
    clientMetadata: null,
    allowInsecureLoopbackClientIds: false,
    remoteControlProgramSwitches: async () => switches.getSwitches(),
    // This host is the relay service
    relay: null,
    connectionTokenVerificationKey: keySet,
  };

  return {
    context,
    keySet,
    isDatabaseAvailable: () =>
      resolveWithin(
        prisma.$queryRaw`SELECT 1`.then(
          () => true,
          () => false,
        ),
        DATABASE_CHECK_TIMEOUT_MILLISECONDS,
        false,
      ),
    disconnectDatabase: () => prisma.$disconnect(),
  };
};
