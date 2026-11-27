import { prisma } from "@sam-monorepo/database";
import { AuditEventType } from "@sam-monorepo/domain";
import { createLogEntryRowData } from "../../../packages/application/test/remoteControlProgram.js";

/**
 * The database steps of the tests. The relay service itself uses Prisma only
 * in its composition root (see `src/boundaries.test.ts`).
 */

export { truncateAllTables } from "../../../packages/application/test/database.js";

export const OWNER_PERMISSION_STRINGS = [
  "login;manage",
  "remoteControlProgram;use",
] as const;

/**
 * A citizen with a user who passes the clearance and has
 * `remoteControlProgram;use`
 */
export const createOwner = async (handle = "owner") => {
  const citizen = await prisma.citizen.create({
    data: {
      handle,
      user: { create: { emailVerified: new Date() } },
      roleAssignments: {
        create: {
          role: {
            create: {
              name: `${handle} role`,
              permissionStrings: {
                create: OWNER_PERMISSION_STRINGS.map((permissionString) => ({
                  permissionString,
                })),
              },
            },
          },
        },
      },
    },
    select: { id: true, handle: true, userId: true },
  });
  if (citizen.userId === null) throw new Error("The owner has no user");

  return { citizenId: citizen.id, handle, userId: citizen.userId };
};

/** An OAuth grant of the user, without the consent page */
export const createOAuthGrant = async ({
  userId,
  clientId,
  scope,
  resource,
}: {
  readonly userId: string;
  readonly clientId: string;
  readonly scope: string;
  readonly resource: string;
}) =>
  (
    await prisma.oAuthGrant.create({
      data: {
        userId,
        clientId,
        clientName: "SAM Desktop Companion",
        redirectHost: "127.0.0.1",
        scope,
        resource,
      },
      select: { id: true },
    })
  ).id;

export const findLogEntryRows = (ownerCitizenId: string) =>
  prisma.logAnalyzerEntry.findMany({
    where: { createdById: ownerCitizenId },
    orderBy: { lineNumber: "asc" },
    select: { type: true, lineNumber: true, runtimeId: true },
  });

export const findRuntimeLease = (ownerCitizenId: string, runtimeId: string) =>
  prisma.remoteControlProgramRuntime.findUnique({
    where: { ownerId_runtimeId: { ownerId: ownerCitizenId, runtimeId } },
    select: { leaseExpiresAt: true, announcement: true },
  });

export const findUploadCountEvents = () =>
  prisma.auditEvent.findMany({
    where: {
      type: AuditEventType.REMOTE_CONTROL_PROGRAM_FEED_ENTRIES_UPLOADED,
    },
    select: { data: true, createdById: true },
  });

/**
 * Stored entries of `log_entries` of the owner, without the relay service.
 * Gives their keys.
 */
export const createLogEntryRows = async (
  ownerCitizenId: string,
  eventAts: readonly Date[],
) => {
  const rows = await Promise.all(
    eventAts.map((eventAt) => createLogEntryRowData(ownerCitizenId, eventAt)),
  );
  await prisma.logAnalyzerEntry.createMany({ data: rows });
  return rows.map((row) => row.hash);
};
