import { trace } from "@opentelemetry/api";
import { prisma } from "@sam-monorepo/database";
import { UserRole } from "@sam-monorepo/database/browser";
import {
  getRemoteControlProgramSwitches,
  transformPermissionStringToPermissionSet,
  type AuditEventInput,
} from "@sam-monorepo/domain";
import { createActor, type Actor, type ActorCitizen } from "../src/actor.js";
import {
  createApplicationUrls,
  type ApplicationContext,
  type CitizenRealtimeEvent,
  type EmailRequest,
  type Notification,
} from "../src/context.js";

/** A fixed clock, thus a result does not depend on the day of the test run */
export const TEST_NOW = new Date("2026-06-15T10:00:00.000Z");

const SILENT_LOGGER: ApplicationContext["log"] = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

type TestApplicationContextOptions = Partial<
  Omit<ApplicationContext, "now">
> & {
  readonly now?: Date;
};

export const createTestApplicationContext = ({
  now = TEST_NOW,
  ...overrides
}: TestApplicationContextOptions = {}) => {
  const auditEvents: AuditEventInput[] = [];
  const notifications: Notification[] = [];
  const emailRequests: EmailRequest[] = [];
  const terminatedRealtimeUserIds: string[] = [];
  const publishedRealtimeEvents: CitizenRealtimeEvent[] = [];

  const context: ApplicationContext = {
    prisma,
    audit: {
      create: async (events) => {
        auditEvents.push(...events);
      },
    },
    notifications: {
      trigger: async (requestedNotifications) => {
        notifications.push(...requestedNotifications);
      },
    },
    email: {
      request: async (request) => {
        emailRequests.push(request);
      },
    },
    log: SILENT_LOGGER,
    tracer: trace.getTracer("test"),
    // A copy, thus a use case that changes the date does not change the clock
    now: () => new Date(now),
    changelog: null,
    collab: null,
    realtime: {
      terminateUserConnections: async (userId) => {
        terminatedRealtimeUserIds.push(userId);
      },
      publishToCitizens: async (events) => {
        publishedRealtimeEvents.push(...events);
      },
    },
    discord: null,
    storage: null,
    images: null,
    urls: createApplicationUrls({
      baseUrl: "https://sam.example.com",
      publicUploadBaseUrl: "https://uploads.example.com",
    }),
    signingKey: async () => null,
    clientMetadata: null,
    allowInsecureLoopbackClientIds: false,
    remoteControlProgramSwitches: async () =>
      getRemoteControlProgramSwitches(() => false),
    relay: null,
    connectionTokenVerificationKey: null,
    ...overrides,
  };

  return {
    context,
    auditEvents,
    notifications,
    emailRequests,
    terminatedRealtimeUserIds,
    publishedRealtimeEvents,
  };
};

interface TestActorOptions {
  readonly userId: string;
  /** The citizen must exist in the database when a use case writes its id */
  readonly citizen?: ActorCitizen | null;
  readonly permissionStrings?: readonly string[];
  readonly roleIds?: readonly string[];
  /** Gives the actor the admin role without admin mode */
  readonly admin?: boolean;
  /** Gives the actor the admin role with admin mode */
  readonly adminMode?: boolean;
}

export const createTestActor = ({
  userId,
  citizen = null,
  permissionStrings = [],
  roleIds = [],
  admin = false,
  adminMode = false,
}: TestActorOptions): Actor =>
  createActor({
    userId,
    userRole: admin || adminMode ? UserRole.ADMIN : null,
    emailConfirmedAt: TEST_NOW,
    citizen,
    roleIds: new Set(roleIds),
    discordUserId: null,
    discordTwoFactorEnabled: true,
    permissionSets: permissionStrings.map(
      transformPermissionStringToPermissionSet,
    ),
    adminMode,
  });
