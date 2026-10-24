import { prisma } from "@sam-monorepo/database";
import { UserRole } from "@sam-monorepo/database/client";
import { AuditEventType } from "@sam-monorepo/domain";
import { beforeEach, expect, test } from "vitest";
import {
  createTestApplicationContext,
  TEST_NOW,
} from "../../test/applicationContext.js";
import { truncateAllTables } from "../../test/database.js";
import { purgeExpiredOAuthRecords } from "./purgeExpiredOAuthRecords.js";

const ONE_MINUTE_IN_MILLISECONDS = 60 * 1000;
const ONE_DAY_IN_MILLISECONDS = 24 * 60 * ONE_MINUTE_IN_MILLISECONDS;

const minutesFromNow = (minutes: number) =>
  new Date(TEST_NOW.getTime() + minutes * ONE_MINUTE_IN_MILLISECONDS);

const CLIENT = {
  clientId: "https://client.example.com/metadata",
  scope: "mcp",
  resource: "https://sam.example.com/api/mcp",
};

let userId: string;
let hashSequence = 0;

const createGrant = async ({
  createdAt,
  revokedAt = null,
}: {
  readonly createdAt: Date;
  readonly revokedAt?: Date | null;
}) =>
  prisma.oAuthGrant.create({
    data: {
      ...CLIENT,
      userId,
      clientName: "Client",
      redirectHost: "client.example.com",
      createdAt,
      revokedAt,
    },
  });

const createCode = (
  grantId: string,
  { expiresAt, usedAt = null }: { expiresAt: Date; usedAt?: Date | null },
) =>
  prisma.oAuthAuthorizationCode.create({
    data: {
      ...CLIENT,
      codeHash: `code-${hashSequence++}`,
      redirectUri: "https://client.example.com/callback",
      codeChallenge: "challenge",
      userId,
      grantId,
      expiresAt,
      usedAt,
    },
  });

const createRefreshToken = (
  grantId: string,
  { expiresAt, usedAt = null }: { expiresAt: Date; usedAt?: Date | null },
) =>
  prisma.oAuthRefreshToken.create({
    data: {
      grantId,
      tokenHash: `token-${hashSequence++}`,
      expiresAt,
      usedAt,
    },
  });

beforeEach(async () => {
  await truncateAllTables();
  ({ id: userId } = await prisma.user.create({ data: {} }));
});

const createClientMetadata = (clientId: string, expiresAt: Date) =>
  prisma.oAuthClientMetadata.create({
    data: {
      clientId,
      document: {},
      clientName: "Client",
      redirectUris: [],
      fetchedAt: new Date(expiresAt.getTime() - ONE_DAY_IN_MILLISECONDS),
      expiresAt,
    },
  });

test("deletes expired codes, expired refresh tokens, grants without a token and expired client metadata", async () => {
  const connectedGrant = await createGrant({
    createdAt: new Date(TEST_NOW.getTime() - 40 * ONE_DAY_IN_MILLISECONDS),
  });
  const redeemedCode = await createCode(connectedGrant.id, {
    expiresAt: new Date(TEST_NOW.getTime() - 40 * ONE_DAY_IN_MILLISECONDS),
    usedAt: new Date(TEST_NOW.getTime() - 40 * ONE_DAY_IN_MILLISECONDS),
  });
  await createRefreshToken(connectedGrant.id, {
    expiresAt: minutesFromNow(-60),
    usedAt: new Date(TEST_NOW.getTime() - 31 * ONE_DAY_IN_MILLISECONDS),
  });
  const currentRefreshToken = await createRefreshToken(connectedGrant.id, {
    expiresAt: new Date(TEST_NOW.getTime() + ONE_DAY_IN_MILLISECONDS),
  });

  // The client did not redeem the code
  const abandonedGrant = await createGrant({ createdAt: minutesFromNow(-60) });
  await createCode(abandonedGrant.id, { expiresAt: minutesFromNow(-50) });

  const revokedGrant = await createGrant({
    createdAt: minutesFromNow(-60),
    revokedAt: minutesFromNow(-30),
  });
  await createCode(revokedGrant.id, {
    expiresAt: minutesFromNow(-50),
    usedAt: minutesFromNow(-59),
  });

  // The user gave the consent a moment ago
  const pendingGrant = await createGrant({ createdAt: minutesFromNow(-1) });
  const pendingCode = await createCode(pendingGrant.id, {
    expiresAt: minutesFromNow(9),
  });

  await createClientMetadata(
    "https://old.example.com/metadata",
    minutesFromNow(-25 * 60),
  );
  const recentlyExpiredClientMetadata = await createClientMetadata(
    "https://recent.example.com/metadata",
    minutesFromNow(-60),
  );

  const { context, auditEvents } = createTestApplicationContext();

  const output = await purgeExpiredOAuthRecords(context);

  expect(output).toEqual({
    authorizationCodeCount: 1,
    refreshTokenCount: 1,
    grantCount: 2,
    clientMetadataCount: 1,
    adminModeResetCount: 0,
  });

  expect(
    (await prisma.oAuthGrant.findMany({ select: { id: true } }))
      .map(({ id }) => id)
      .toSorted(),
  ).toEqual([connectedGrant.id, pendingGrant.id].toSorted());
  expect(
    (await prisma.oAuthAuthorizationCode.findMany({ select: { id: true } }))
      .map(({ id }) => id)
      .toSorted(),
  ).toEqual([redeemedCode.id, pendingCode.id].toSorted());
  expect(
    await prisma.oAuthRefreshToken.findMany({ select: { id: true } }),
  ).toEqual([{ id: currentRefreshToken.id }]);
  expect(
    await prisma.oAuthClientMetadata.findMany({ select: { id: true } }),
  ).toEqual([{ id: recentlyExpiredClientMetadata.id }]);
  expect(auditEvents).toEqual([
    {
      type: AuditEventType.OAUTH_RECORDS_PURGED,
      data: {
        authorizationCodeCount: 1,
        refreshTokenCount: 1,
        grantCount: 2,
        clientMetadataCount: 1,
      },
      createdById: null,
    },
  ]);
});

test("turns off the admin mode of the grants of users who are not admins anymore", async () => {
  const { id: adminId } = await prisma.user.create({
    data: { role: UserRole.ADMIN },
  });
  const createConnectedGrant = async (grantUserId: string) => {
    const grant = await prisma.oAuthGrant.create({
      data: {
        ...CLIENT,
        userId: grantUserId,
        clientName: "Client",
        redirectHost: "client.example.com",
        createdAt: minutesFromNow(-60),
        adminModeEnabledAt: minutesFromNow(-60),
        adminModeEnabledById: grantUserId,
      },
    });
    await createRefreshToken(grant.id, {
      expiresAt: new Date(TEST_NOW.getTime() + ONE_DAY_IN_MILLISECONDS),
    });
    return grant;
  };
  // The user of `userId` was an admin when they enabled the admin mode
  const demotedGrant = await createConnectedGrant(userId);
  const adminGrant = await createConnectedGrant(adminId);

  const { context, auditEvents } = createTestApplicationContext();

  const output = await purgeExpiredOAuthRecords(context);

  expect(output.adminModeResetCount).toBe(1);
  const readAdminMode = async (grantId: string) =>
    (
      await prisma.oAuthGrant.findUniqueOrThrow({
        where: { id: grantId },
        select: { adminModeEnabledAt: true },
      })
    ).adminModeEnabledAt;
  expect(await readAdminMode(demotedGrant.id)).toBeNull();
  expect(await readAdminMode(adminGrant.id)).toEqual(minutesFromNow(-60));
  expect(auditEvents).toEqual([
    {
      type: AuditEventType.OAUTH_GRANT_ADMIN_MODE_UPDATED,
      data: {
        grantId: demotedGrant.id,
        clientId: CLIENT.clientId,
        enabled: false,
      },
      createdById: null,
    },
  ]);
});
