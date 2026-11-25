import { prisma } from "@sam-monorepo/database";
import {
  CapabilityId,
  ConnectorId,
  createLogEntryHash,
  GranteeKind,
  GrantOperation,
  IP_ADDRESS_MARKER,
  LogAnalyzerEntryType,
  type AnnounceContent,
} from "@sam-monorepo/domain";
import { createTestActor, TEST_NOW } from "./applicationContext.js";
import {
  CLEARED_USER,
  createCitizenWithPermissions,
} from "./citizensWithPermissions.js";

/** The shared test data of the integration tests of the Remote Control Program */

export const MINUTE_MILLISECONDS = 60 * 1000;
export const HOUR_MILLISECONDS = 60 * MINUTE_MILLISECONDS;
export const DAY_MILLISECONDS = 24 * HOUR_MILLISECONDS;

export const getTimeBeforeNow = (milliseconds: number) =>
  new Date(TEST_NOW.getTime() - milliseconds);

export const getTimeAfterNow = (milliseconds: number) =>
  new Date(TEST_NOW.getTime() + milliseconds);

export const ONE_HOUR_AGO = getTimeBeforeNow(HOUR_MILLISECONDS);
export const TWO_HOURS_AGO = getTimeBeforeNow(2 * HOUR_MILLISECONDS);
export const IN_ONE_HOUR = getTimeAfterNow(HOUR_MILLISECONDS);

/** The permissions of a viewer of the Log Analyzer, and of an owner */
export const VIEWER_PERMISSIONS = [
  "login;manage",
  "remoteControlProgram;use",
  "logAnalyzer;read",
];

/**
 * A citizen with a user who passes the clearance page. A role of its own
 * grants the permission strings.
 */
export const createClearedCitizen = (
  handle: string,
  permissionStrings: readonly string[] = VIEWER_PERMISSIONS,
  roleIds: readonly string[] = [],
) =>
  createCitizenWithPermissions(
    handle,
    permissionStrings,
    roleIds,
    CLEARED_USER,
  );

/** The actor of a new citizen of `createClearedCitizen()` */
export const createCitizenActor = async (
  handle: string,
  permissionStrings: readonly string[] = VIEWER_PERMISSIONS,
  roleIds: readonly string[] = [],
) => {
  const citizen = await createClearedCitizen(
    handle,
    permissionStrings,
    roleIds,
  );

  return createTestActor({
    userId: citizen.userId!,
    citizen,
    permissionStrings,
    roleIds,
  });
};

type ShareGrantRowGrantee =
  | {
      readonly granteeKind: typeof GranteeKind.citizen;
      readonly granteeCitizenId: string;
    }
  | {
      readonly granteeKind: typeof GranteeKind.role;
      readonly granteeRoleId: string;
    }
  | { readonly granteeKind: typeof GranteeKind.everyone };

interface ShareGrantRowValidity {
  readonly startsAt: Date;
  readonly endsAt?: Date;
  readonly revokedAt?: Date;
}

export const toCitizenGrantee = (
  granteeCitizenId: string,
): ShareGrantRowGrantee => ({
  granteeKind: GranteeKind.citizen,
  granteeCitizenId,
});

export const EVERYONE_GRANTEE: ShareGrantRowGrantee = {
  granteeKind: GranteeKind.everyone,
};

/** A grant of `read` on `log_entries`, without the use case */
export const createShareGrantRow = (
  ownerId: string,
  grantee: ShareGrantRowGrantee,
  validity: ShareGrantRowValidity = { startsAt: ONE_HOUR_AGO },
) =>
  prisma.shareGrant.create({
    data: {
      ownerId,
      ...grantee,
      capabilityIds: [CapabilityId.LogEntries],
      operations: [GrantOperation.Read],
      ...validity,
    },
  });

/** A line of the pattern `JoinPu` at the time, with the IP marker */
export const createJoinPuLine = (time: Date, address = IP_ADDRESS_MARKER) =>
  `<${time.toISOString()}> [Notice] <Join PU> address[${address}] port[64336] shard[pub_euw1b_10512345_100] locationId[-281470681677823] [Team_GameServices][GIM][Matchmaking]`;

/** The row of a `JoinPu` entry of the owner that the relay stored at `createdAt` */
export const createLogEntryRowData = async (
  ownerId: string,
  eventAt: Date,
  createdAt = TEST_NOW,
) => {
  const rawLine = createJoinPuLine(eventAt);

  return {
    type: LogAnalyzerEntryType.JoinPu,
    rawLine,
    eventAt,
    lineNumber: 1,
    hash: await createLogEntryHash(LogAnalyzerEntryType.JoinPu, rawLine),
    createdById: ownerId,
    createdAt,
  };
};

export const createLogEntryRow = async (
  ownerId: string,
  eventAt: Date,
  createdAt?: Date,
) =>
  prisma.logAnalyzerEntry.create({
    data: await createLogEntryRowData(ownerId, eventAt, createdAt),
  });

/** The `announce` of a browser runtime with the log file connector */
export const LOG_FILE_ANNOUNCEMENT: AnnounceContent = {
  connectors: [
    {
      id: ConnectorId.LogFile,
      version: 1,
      capabilities: [{ id: CapabilityId.LogEntries, version: 1 }],
    },
  ],
  local_access_layer: {
    capability_rules: [
      {
        capability_id: CapabilityId.LogEntries,
        is_on: true,
        is_filtered: true,
      },
    ],
  },
};
