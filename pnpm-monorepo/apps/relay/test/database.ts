import { prisma } from "@sam-monorepo/database";
import { AuditEventType } from "@sam-monorepo/domain";

/**
 * The database steps of the tests. The relay service itself uses Prisma only
 * in its composition root (see `src/boundaries.test.ts`).
 */

/** Gives each test an empty database */
export const truncateAllTables = async () => {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;

  const quotedNames = tables
    .map(({ tablename }) => `"${tablename}"`)
    .join(", ");

  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${quotedNames} CASCADE`);
};

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

export const banUser = (userId: string) =>
  prisma.user.update({
    where: { id: userId },
    data: { bannedAt: new Date() },
    select: { id: true },
  });

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
