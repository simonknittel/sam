import { test as base, expect } from "@playwright/test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type User } from "@sam-monorepo/database/client";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { GenericContainer, Wait } from "testcontainers";
import { getFreePort, stopProcess, waitForHttpOk } from "../setup/processes";
import {
  appDirectory,
  appDummyEnvironment,
  collabImageTag,
  collabJwtSecret,
  collabPort,
  containerDatabaseUrl,
  hostDatabaseUrl,
  readStackState,
  s3Environment,
  templateDatabase,
  unleashEnvironment,
} from "../setup/stack";
import { startDiscordMock, type DiscordMock } from "./discord-mock";
import { ONE_DAY_MS } from "./factories";

interface WorkerStack {
  readonly baseURL: string;
  readonly prisma: PrismaClient;
  /** HTTP base of the worker's collab container (e.g. for /replace) */
  readonly collabHttpUrl: string;
  readonly discordMock: DiscordMock;
}

interface Fixtures {
  readonly prisma: PrismaClient;
  /** HTTP base of the worker's collab container (e.g. for /replace) */
  readonly collabHttpUrl: string;
  /**
   * The worker's stand-in for Discord's REST API, reset between tests like
   * the database.
   */
  readonly discordMock: DiscordMock;
  /**
   * Signs the given user in by inserting a database session and setting the
   * session cookie (next-auth v4 database sessions).
   */
  readonly signIn: (user: Pick<User, "id">) => Promise<void>;
  /**
   * Signs the given user in instead of the current one. Only the session
   * cookie is dropped, so everything else the test set up — admin mode, the
   * wiki clipboard — survives the switch.
   */
  readonly switchUser: (user: Pick<User, "id">) => Promise<void>;
  /**
   * Sets the cookie the AdminEnabler uses. Only effective for users whose
   * `User.role` is "admin".
   */
  readonly enableAdminMode: () => Promise<void>;
  readonly databaseReset: undefined;
}

interface WorkerFixtures {
  readonly stack: WorkerStack;
}

/** next-auth v4 database sessions, unprefixed because the stack is HTTP. */
const SESSION_COOKIE_NAME = "next-auth.session-token";

const createPrismaClient = (databaseUrl: string) =>
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });

const CREATE_DATABASE_ATTEMPTS = 5;

/**
 * Worker databases are cloned from the migrated template. Concurrent clones
 * of the same template can briefly conflict, hence the retry.
 */
const createWorkerDatabase = async (
  adminDatabaseUrl: string,
  databaseName: string,
) => {
  const adminPrisma = createPrismaClient(adminDatabaseUrl);
  try {
    for (let attempt = 1; ; attempt++) {
      try {
        await adminPrisma.$executeRawUnsafe(
          `CREATE DATABASE "${databaseName}" TEMPLATE "${templateDatabase}"`,
        );
        return;
      } catch (error) {
        if (attempt === CREATE_DATABASE_ATTEMPTS) throw error;
        await sleep(500 * attempt);
      }
    }
  } finally {
    await adminPrisma.$disconnect();
  }
};

const TRUNCATE_ATTEMPTS = 3;

const truncateAllTables = async (prisma: PrismaClient) => {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  if (tables.length === 0) return;

  const quotedNames = tables
    .map(({ tablename }) => `"${tablename}"`)
    .join(", ");

  /**
   * The previous test's collab teardown writes (final store, audit event)
   * can race this multi-table TRUNCATE into a deadlock; Postgres picks a
   * victim, which may be us — the standard remedy is to retry.
   */
  for (let attempt = 1; ; attempt++) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${quotedNames} CASCADE`);
      return;
    } catch (error) {
      if (attempt === TRUNCATE_ATTEMPTS) throw error;
      await sleep(250 * attempt);
    }
  }
};

export const test = base.extend<Fixtures, WorkerFixtures>({
  stack: [
    async ({}, use, workerInfo) => {
      const state = readStackState();
      const databaseName = `worker_${workerInfo.workerIndex}`;

      await createWorkerDatabase(
        hostDatabaseUrl(state, "postgres"),
        databaseName,
      );

      const collabContainer = await new GenericContainer(collabImageTag)
        .withNetworkMode(state.networkName)
        .withEnvironment({
          DATABASE_URL: containerDatabaseUrl(databaseName),
          COLLAB_JWT_SECRET: collabJwtSecret,
        })
        .withExposedPorts(collabPort)
        // An open port only means the socket is bound; /health answers once
        // the server is actually serving requests.
        .withWaitStrategy(Wait.forHttp("/health", collabPort))
        .start();

      const appPort = await getFreePort();
      const baseURL = `http://localhost:${appPort}`;
      const workerDatabaseUrl = hostDatabaseUrl(state, databaseName);
      const collabHttpUrl = `http://localhost:${collabContainer.getMappedPort(collabPort)}`;
      const discordMock = await startDiscordMock();

      const appProcess = spawn(
        "pnpm",
        ["exec", "next", "start", "--port", appPort.toString()],
        {
          cwd: appDirectory,
          env: {
            ...process.env,
            ...appDummyEnvironment,
            ...s3Environment(state.s3Port),
            // Also overrides any UNLEASH_* variables of the dev shell — the
            // suite must never talk to a live flag provider
            ...unleashEnvironment(state.unleashPort),
            DATABASE_URL: workerDatabaseUrl,
            NEXTAUTH_URL: baseURL,
            COLLAB_URL: `ws://localhost:${collabContainer.getMappedPort(collabPort)}`,
            COLLAB_JWT_SECRET: collabJwtSecret,
            // Publishing events talks to the worker's mock, never to Discord
            DISCORD_API_BASE_URL: discordMock.baseUrl,
          },
          stdio: "inherit",
        },
      );

      try {
        await waitForHttpOk(baseURL, appProcess);

        const prisma = createPrismaClient(workerDatabaseUrl);
        await use({ baseURL, prisma, collabHttpUrl, discordMock });
        await prisma.$disconnect();
      } finally {
        await stopProcess(appProcess);
        await collabContainer.stop();
        await discordMock.close();
      }
    },
    { scope: "worker", timeout: 240_000 },
  ],

  baseURL: async ({ stack }, use) => {
    await use(stack.baseURL);
  },

  prisma: async ({ stack }, use) => {
    await use(stack.prisma);
  },

  collabHttpUrl: async ({ stack }, use) => {
    await use(stack.collabHttpUrl);
  },

  discordMock: async ({ stack }, use) => {
    await use(stack.discordMock);
  },

  databaseReset: [
    async ({ stack }, use) => {
      await truncateAllTables(stack.prisma);
      stack.discordMock.reset();
      await use(undefined);
    },
    { auto: true },
  ],

  signIn: async ({ stack, context }, use) => {
    await use(async (user) => {
      const sessionToken = randomBytes(32).toString("hex");
      await stack.prisma.session.create({
        data: {
          sessionToken,
          userId: user.id,
          expires: new Date(Date.now() + ONE_DAY_MS),
        },
      });

      await context.addCookies([
        {
          name: SESSION_COOKIE_NAME,
          value: sessionToken,
          domain: "localhost",
          path: "/",
        },
      ]);
    });
  },

  switchUser: async ({ context, signIn }, use) => {
    await use(async (user) => {
      const preserved = (await context.cookies()).filter(
        (cookie) => cookie.name !== SESSION_COOKIE_NAME,
      );
      await context.clearCookies();
      if (preserved.length > 0) await context.addCookies(preserved);

      await signIn(user);
    });
  },

  enableAdminMode: async ({ context }, use) => {
    await use(async () => {
      await context.addCookies([
        { name: "enable_admin", value: "1", domain: "localhost", path: "/" },
      ]);
    });
  },
});

export { expect };
