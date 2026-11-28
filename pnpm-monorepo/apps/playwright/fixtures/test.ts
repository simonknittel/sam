import {
  test as base,
  expect,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type User } from "@sam-monorepo/database/client";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
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
  relayEnvironment,
  relayImageTag,
  relayPort,
  s3Environment,
  soketiEnvironment,
  templateDatabase,
  unleashAppName,
  unleashEnvironment,
} from "../setup/stack";
import { startCimdServer, type CimdServer } from "./cimd-server";
import { startDiscordMock, type DiscordMock } from "./discord-mock";
import { ONE_DAY_MS } from "./factories";
import { createMcpClient, type McpTestClient } from "./mcp-client";
import {
  authorizeDesktopCompanion,
  authorizeMcpClient,
  type AuthorizeDesktopCompanionOptions,
  type AuthorizeMcpClientOptions,
  type McpAuthorization,
} from "./oauth";
import type { StackScope } from "./unleash";

interface WorkerStack {
  readonly baseURL: string;
  readonly prisma: PrismaClient;
  readonly collabHttpUrl: string;
  readonly discordMock: DiscordMock;
  readonly unleashAppName: string;
  /** The WebSocket URL of the worker's relay container */
  readonly relayUrl: string;
}

interface Fixtures {
  readonly prisma: PrismaClient;
  readonly collabHttpUrl: string;
  readonly discordMock: DiscordMock;
  readonly signIn: (user: Pick<User, "id">) => Promise<void>;
  /**
   * Drops only the session cookie: the admin mode and the wiki clipboard
   * survive the switch.
   */
  readonly switchUser: (user: Pick<User, "id">) => Promise<void>;
  /**
   * Opens a page in a new browser context with a session of the user. A
   * second browser has its own storage, thus it also runs its own browser
   * runtime of the Remote Control Program. The fixture closes the context
   * after the test.
   */
  readonly openSignedInBrowser: (user: Pick<User, "id">) => Promise<Page>;
  /**
   * The WebSocket URL of the worker's relay container (the relay service of
   * the Remote Control Program), for example to find the connections of a
   * browser runtime
   */
  readonly relayUrl: string;
  /** Only effective for users whose `User.role` is ADMIN. */
  readonly enableAdminMode: () => Promise<void>;
  /** Overrides the date (`YYYY-MM-DD`) that the seasonal themes resolve for. */
  readonly setSeasonalDate: (date: string) => Promise<void>;
  readonly stackFlagScope: StackScope;
  /** Signs the user in. */
  readonly authorizeMcpClient: (
    user: Pick<User, "id">,
    options?: Pick<AuthorizeMcpClientOptions, "beforeApprove">,
  ) => Promise<McpAuthorization>;
  readonly connectMcpClient: (accessToken: string) => Promise<McpTestClient>;
  /** The real OAuth login of the desktop companion (see `fixtures/oauth.ts`) */
  readonly authorizeDesktopCompanion: (
    user: Pick<User, "id">,
    options?: Pick<AuthorizeDesktopCompanionOptions, "beforeApprove">,
  ) => Promise<McpAuthorization>;
  readonly databaseReset: undefined;
}

interface WorkerFixtures {
  readonly stack: WorkerStack;
  readonly cimdServer: CimdServer;
}

/** next-auth v4 database sessions, unprefixed because the stack is HTTP. */
const SESSION_COOKIE_NAME = "next-auth.session-token";

/** The date override of the seasonal themes (see setSeasonalDate). */
const SEASONAL_DATE_COOKIE_NAME = "seasonal-date";

/**
 * Inserts a next-auth database session for the user and sets its cookie in
 * the browser context
 */
const addSessionCookie = async (
  prisma: PrismaClient,
  browserContext: BrowserContext,
  user: Pick<User, "id">,
) => {
  const sessionToken = randomBytes(32).toString("hex");
  await prisma.session.create({
    data: {
      sessionToken,
      userId: user.id,
      expires: new Date(Date.now() + ONE_DAY_MS),
    },
  });

  await browserContext.addCookies([
    {
      name: SESSION_COOKIE_NAME,
      value: sessionToken,
      domain: "localhost",
      path: "/",
    },
  ]);
};

const createPrismaClient = (databaseUrl: string) =>
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });

/**
 * Concurrent clones of the same template can briefly conflict, hence the retry.
 */
const createWorkerDatabase = async (
  adminDatabaseUrl: string,
  databaseName: string,
) => {
  const adminPrisma = createPrismaClient(adminDatabaseUrl);
  try {
    await expect(() =>
      adminPrisma.$executeRawUnsafe(
        `CREATE DATABASE "${databaseName}" TEMPLATE "${templateDatabase}"`,
      ),
    ).toPass({ intervals: [500, 1_000, 1_500, 2_000], timeout: 10_000 });
  } finally {
    await adminPrisma.$disconnect();
  }
};

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
  await expect(() =>
    prisma.$executeRawUnsafe(`TRUNCATE TABLE ${quotedNames} CASCADE`),
  ).toPass({ intervals: [250, 500], timeout: 5_000 });
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
      const appName = unleashAppName(workerInfo.workerIndex);

      const relayContainer = await new GenericContainer(relayImageTag)
        .withNetworkMode(state.networkName)
        .withEnvironment(
          relayEnvironment({
            databaseName,
            appBaseUrl: baseURL,
            unleashAppName: appName,
          }),
        )
        .withExposedPorts(relayPort)
        .withWaitStrategy(Wait.forHttp("/health", relayPort))
        .start();

      const relayUrl = `ws://localhost:${relayContainer.getMappedPort(relayPort)}`;

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
            ...unleashEnvironment(state.unleashPort, appName),
            ...soketiEnvironment,
            DATABASE_URL: workerDatabaseUrl,
            NEXTAUTH_URL: baseURL,
            COLLAB_URL: `ws://localhost:${collabContainer.getMappedPort(collabPort)}`,
            COLLAB_JWT_SECRET: collabJwtSecret,
            RELAY_URL: relayUrl,
            DISCORD_API_BASE_URL: discordMock.baseUrl,
          },
          stdio: "inherit",
        },
      );

      try {
        await waitForHttpOk(baseURL, appProcess);

        const prisma = createPrismaClient(workerDatabaseUrl);
        await use({
          baseURL,
          prisma,
          collabHttpUrl,
          discordMock,
          unleashAppName: appName,
          relayUrl,
        });
        await prisma.$disconnect();
      } finally {
        await stopProcess(appProcess);
        await relayContainer.stop();
        await collabContainer.stop();
        await discordMock.close();
      }
    },
    { scope: "worker", timeout: 240_000 },
  ],

  cimdServer: [
    async ({}, use) => {
      const cimdServer = await startCimdServer();
      try {
        await use(cimdServer);
      } finally {
        await cimdServer.close();
      }
    },
    { scope: "worker" },
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

  relayUrl: async ({ stack }, use) => {
    await use(stack.relayUrl);
  },

  signIn: async ({ stack, context }, use) => {
    await use((user) => addSessionCookie(stack.prisma, context, user));
  },

  openSignedInBrowser: async (
    { browser, stack, viewport, contextOptions },
    use,
  ) => {
    const browserContexts: BrowserContext[] = [];

    await use(async (user) => {
      const browserContext = await browser.newContext({
        ...contextOptions,
        baseURL: stack.baseURL,
        viewport,
      });
      browserContexts.push(browserContext);

      await addSessionCookie(stack.prisma, browserContext, user);
      return browserContext.newPage();
    });

    await Promise.all(
      browserContexts.map((browserContext) => browserContext.close()),
    );
  },

  switchUser: async ({ context, signIn }, use) => {
    await use(async (user) => {
      await context.clearCookies({ name: SESSION_COOKIE_NAME });
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

  stackFlagScope: async ({ stack }, use) => {
    await use({ appName: stack.unleashAppName });
  },

  authorizeMcpClient: async (
    { page, request, stack, signIn, cimdServer },
    use,
  ) => {
    await use((user, options) =>
      authorizeMcpClient({
        page,
        request,
        baseUrl: stack.baseURL,
        signIn,
        cimdServer,
        user,
        ...options,
      }),
    );
  },

  authorizeDesktopCompanion: async ({ page, request, stack, signIn }, use) => {
    await use((user, options) =>
      authorizeDesktopCompanion({
        page,
        request,
        baseUrl: stack.baseURL,
        signIn,
        user,
        ...options,
      }),
    );
  },

  connectMcpClient: async ({ stack }, use) => {
    const clients: McpTestClient[] = [];

    await use(async (accessToken) => {
      const client = await createMcpClient({
        baseUrl: stack.baseURL,
        accessToken,
      });
      clients.push(client);
      return client;
    });

    await Promise.all(clients.map((client) => client.close()));
  },

  setSeasonalDate: async ({ context }, use) => {
    await use(async (date) => {
      await context.addCookies([
        {
          name: SEASONAL_DATE_COOKIE_NAME,
          value: date,
          domain: "localhost",
          path: "/",
        },
      ]);
    });
  },
});

export { expect };
