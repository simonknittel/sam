import { prisma } from "@sam-monorepo/database";
import { AuditEventType, type AuditEventInput } from "@sam-monorepo/domain";
import { beforeEach, expect, test } from "vitest";
import {
  createTestApplicationContext,
  TEST_NOW,
} from "../../test/applicationContext.js";
import {
  CLEARED_USER,
  createCitizenWithPermissions,
} from "../../test/citizensWithPermissions.js";
import { truncateAllTables } from "../../test/database.js";
import { createTestSigningKey } from "../../test/signingKey.js";
import type { SigningKey } from "../context.js";
import {
  REFRESH_TOKEN_GRACE_TIME_IN_MILLISECONDS,
  REFRESH_TOKEN_LIFETIME_IN_MILLISECONDS,
} from "./constants.js";
import { OAuthTokenErrorCode } from "./errors.js";
import { refreshAccessToken } from "./refreshAccessToken.js";
import { createOpaqueToken, hashOpaqueToken } from "./secrets.js";

const CLIENT_ID = "https://client.example.com/oauth/metadata.json";

let signingKey: SigningKey;
let grantId: string;
let firstRefreshToken: string;
let auditEvents: AuditEventInput[];

beforeEach(async () => {
  await truncateAllTables();
  signingKey = await createTestSigningKey();
  auditEvents = [];

  const citizen = await createCitizenWithPermissions(
    "client-user",
    ["login;manage", "mcp;use"],
    [],
    CLEARED_USER,
  );
  ({ id: grantId } = await prisma.oAuthGrant.create({
    data: {
      userId: citizen.userId!,
      clientId: CLIENT_ID,
      clientName: "Client",
      redirectHost: "client.example.com",
      scope: "mcp",
      resource: "https://sam.example.com/api/mcp",
    },
  }));

  firstRefreshToken = createOpaqueToken();
  await prisma.oAuthRefreshToken.create({
    data: {
      grantId,
      tokenHash: hashOpaqueToken(firstRefreshToken),
      expiresAt: new Date(
        TEST_NOW.getTime() + REFRESH_TOKEN_LIFETIME_IN_MILLISECONDS,
      ),
    },
  });
});

/** A request of the client, the given time after the first refresh */
const refresh = (refreshToken: string, millisecondsAfterNow = 0) => {
  const { context, auditEvents: requestAuditEvents } =
    createTestApplicationContext({
      now: new Date(TEST_NOW.getTime() + millisecondsAfterNow),
      signingKey: async () => signingKey,
    });

  return refreshAccessToken(context, {
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: CLIENT_ID,
  }).finally(() => auditEvents.push(...requestAuditEvents));
};

const INVALID_GRANT = { error: OAuthTokenErrorCode.InvalidGrant };

const expectRevokedGrant = async () => {
  await expect(
    prisma.oAuthGrant.findUniqueOrThrow({ where: { id: grantId } }),
  ).resolves.toMatchObject({ revokedAt: expect.any(Date) });
  expect(await prisma.oAuthRefreshToken.count()).toBe(0);
  expect(auditEvents.map(({ type }) => type)).toEqual([
    AuditEventType.OAUTH_GRANT_REVOKED,
  ]);
};

test("a client that did not get the answer of a refresh uses the old refresh token again within the grace time", async () => {
  const { refresh_token: lostRefreshToken } = await refresh(firstRefreshToken);

  const retry = await refresh(
    firstRefreshToken,
    REFRESH_TOKEN_GRACE_TIME_IN_MILLISECONDS,
  );
  // A comparison of booleans, thus a failure does not print a token
  expect(retry.refresh_token === lostRefreshToken).toBe(false);
  expect(retry.refresh_token === firstRefreshToken).toBe(false);

  // The new token pair works
  await expect(
    refresh(retry.refresh_token, REFRESH_TOKEN_GRACE_TIME_IN_MILLISECONDS),
  ).resolves.toMatchObject({ token_type: "Bearer" });
  expect(auditEvents).toEqual([]);

  // The lost replacement is not valid any more: it was possibly stolen
  await expect(refresh(lostRefreshToken)).rejects.toMatchObject(INVALID_GRANT);
  await expectRevokedGrant();
});

test("the old refresh token works only once more within the grace time", async () => {
  await refresh(firstRefreshToken);
  const retry = await refresh(firstRefreshToken, 1_000);

  await expect(refresh(firstRefreshToken, 2_000)).rejects.toMatchObject(
    INVALID_GRANT,
  );
  await expect(refresh(retry.refresh_token, 2_000)).rejects.toMatchObject(
    INVALID_GRANT,
  );
  await expectRevokedGrant();
});

test("the use of the old refresh token after the grace time revokes the grant", async () => {
  const { refresh_token: replacement } = await refresh(firstRefreshToken);

  await expect(
    refresh(firstRefreshToken, REFRESH_TOKEN_GRACE_TIME_IN_MILLISECONDS + 1),
  ).rejects.toMatchObject(INVALID_GRANT);
  await expect(refresh(replacement)).rejects.toMatchObject(INVALID_GRANT);
  await expectRevokedGrant();
});

test("the use of the old refresh token after the use of its replacement revokes the grant", async () => {
  const { refresh_token: replacement } = await refresh(firstRefreshToken);
  const { refresh_token: nextReplacement } = await refresh(replacement, 1_000);

  await expect(refresh(firstRefreshToken, 2_000)).rejects.toMatchObject(
    INVALID_GRANT,
  );
  await expect(refresh(nextReplacement, 2_000)).rejects.toMatchObject(
    INVALID_GRANT,
  );
  await expectRevokedGrant();
});

test("of two parallel uses of the old refresh token within the grace time, one fails and revokes the grant", async () => {
  await refresh(firstRefreshToken);

  const results = await Promise.allSettled([
    refresh(firstRefreshToken, 1_000),
    refresh(firstRefreshToken, 1_000),
  ]);
  expect(results.map(({ status }) => status).toSorted()).toEqual([
    "fulfilled",
    "rejected",
  ]);
  await expectRevokedGrant();
});
