import { prisma } from "@sam-monorepo/database";
import { RELAY_LIMITS, RuntimeKind } from "@sam-monorepo/domain";
import { createLocalJWKSet, errors, SignJWT } from "jose";
import { beforeEach, expect, test } from "vitest";
import {
  createTestActor,
  createTestApplicationContext,
  TEST_NOW,
} from "../../../test/applicationContext.js";
import {
  CLEARED_ADMIN_USER,
  CLEARED_USER,
  createCitizenWithPermissions,
} from "../../../test/citizensWithPermissions.js";
import { truncateAllTables } from "../../../test/database.js";
import { createTestRelayService } from "../../../test/relayService.js";
import { createTestSigningKey } from "../../../test/signingKey.js";
import { SIGNING_KEY_ALGORITHM, type SigningKey } from "../../context.js";
import { ForbiddenError } from "../../errors.js";
import { RemoteControlProgramErrorMessage } from "../access/remoteControlProgramErrors.js";
import { authenticateRuntimeConnection } from "./authenticateRuntimeConnection.js";
import { RUNTIME_CONNECTION_TOKEN_AUDIENCE } from "./connectionToken.js";
import { issueRuntimeConnectionToken } from "./issueRuntimeConnectionToken.js";
import { KeySetUnavailableError } from "./keySetErrors.js";

const RUNTIME_ID = "0b6f1d3e-2a4c-4e8f-9a1b-3c5d7e9f1a2b";
const OTHER_RUNTIME_ID = "7d9e1f3a-5b6c-4d8e-8f0a-1b2c3d4e5f6a";

let signingKey: SigningKey;

beforeEach(async () => {
  await truncateAllTables();
  signingKey = await createTestSigningKey();
});

/**
 * The owner gets `remoteControlProgram;use` from a role of its own, thus a
 * test can remove the role
 */
const createOwner = async () => {
  const useRole = await prisma.role.create({
    data: {
      name: "Remote Control Program",
      permissionStrings: {
        create: { permissionString: "remoteControlProgram;use" },
      },
    },
  });
  const citizen = await createCitizenWithPermissions(
    "owner",
    ["login;manage"],
    [useRole.id],
    CLEARED_USER,
  );

  return {
    useRoleId: useRole.id,
    citizen,
    actor: createTestActor({
      userId: citizen.userId!,
      citizen,
      permissionStrings: ["login;manage", "remoteControlProgram;use"],
    }),
  };
};

/** The app: it signs the tokens */
const createAppContext = (now = TEST_NOW) =>
  createTestApplicationContext({
    now,
    signingKey: async () => signingKey,
    relay: createTestRelayService().relay,
  }).context;

/** The relay service: no signing key, the key set of the app */
const createRelayContext = (now = TEST_NOW) =>
  createTestApplicationContext({
    now,
    connectionTokenVerificationKey: createLocalJWKSet({
      keys: [
        {
          ...signingKey.publicJwk,
          kid: signingKey.keyId,
          alg: SIGNING_KEY_ALGORITHM,
        },
      ],
    }),
  }).context;

test("issues a token that authenticates a connection of the runtime at the relay service", async () => {
  const owner = await createOwner();

  const issued = await issueRuntimeConnectionToken(
    createAppContext(),
    owner.actor,
    { runtime_id: RUNTIME_ID },
  );

  expect(issued).toEqual({
    token: expect.any(String),
    expiresAt: new Date(
      TEST_NOW.getTime() + RELAY_LIMITS.connectionTokenLifetimeMilliseconds,
    ),
    relayUrl: "wss://relay.example.com/",
    handle: "owner",
  });

  const connection = await authenticateRuntimeConnection(createRelayContext(), {
    token: issued.token,
    runtime_id: RUNTIME_ID,
    runtime_kind: RuntimeKind.browser,
  });

  expect(connection).toMatchObject({
    userId: owner.citizen.userId,
    citizenId: owner.citizen.id,
    runtimeId: RUNTIME_ID,
    tokenExpiresAt: issued.expiresAt,
  });
  expect(connection.actor).toMatchObject({
    userId: owner.citizen.userId,
    citizen: { id: owner.citizen.id, handle: "owner" },
    adminMode: false,
  });
});

test("refuses a token of a different audience, an expired token and a token of a different runtime, and fails as the host when the key set cannot be read", async () => {
  const owner = await createOwner();
  const { token } = await issueRuntimeConnectionToken(
    createAppContext(),
    owner.actor,
    { runtime_id: RUNTIME_ID },
  );
  const tokenOfDifferentAudience = await new SignJWT({
    citizen_id: owner.citizen.id,
    runtime_id: RUNTIME_ID,
    runtime_kind: RuntimeKind.browser,
    admin_mode: false,
  })
    .setProtectedHeader({ alg: SIGNING_KEY_ALGORITHM, kid: signingKey.keyId })
    .setIssuer("https://sam.example.com")
    .setAudience(`${RUNTIME_CONNECTION_TOKEN_AUDIENCE}_other`)
    .setSubject(owner.citizen.userId!)
    .setIssuedAt(TEST_NOW)
    .setExpirationTime("2 minutes")
    .sign(signingKey.privateKey);
  const tokenNotValid = new ForbiddenError(
    RemoteControlProgramErrorMessage.ConnectionTokenNotValid,
  );

  await expect(
    authenticateRuntimeConnection(createRelayContext(), {
      token: tokenOfDifferentAudience,
      runtime_id: RUNTIME_ID,
      runtime_kind: RuntimeKind.browser,
    }),
  ).rejects.toThrow(tokenNotValid);
  await expect(
    authenticateRuntimeConnection(
      createRelayContext(
        new Date(
          TEST_NOW.getTime() + RELAY_LIMITS.connectionTokenLifetimeMilliseconds,
        ),
      ),
      { token, runtime_id: RUNTIME_ID, runtime_kind: RuntimeKind.browser },
    ),
  ).rejects.toThrow(tokenNotValid);
  await expect(
    authenticateRuntimeConnection(createRelayContext(), {
      token,
      runtime_id: OTHER_RUNTIME_ID,
      runtime_kind: RuntimeKind.browser,
    }),
  ).rejects.toThrow(tokenNotValid);

  // Like the remote key set of `jose` after an answer that is not 200
  const { context: contextWithoutKeySet } = createTestApplicationContext({
    connectionTokenVerificationKey: async () => {
      throw new errors.JOSEError(
        "Expected 200 OK from the JSON Web Key Set HTTP response",
      );
    },
  });
  await expect(
    authenticateRuntimeConnection(contextWithoutKeySet, {
      token,
      runtime_id: RUNTIME_ID,
      runtime_kind: RuntimeKind.browser,
    }),
  ).rejects.toThrow(KeySetUnavailableError);
});

test("keeps the admin mode of the app in the token, and ends it with the admin role", async () => {
  const admin = await prisma.citizen.create({
    data: { handle: "admin", ...CLEARED_ADMIN_USER },
  });
  const { token } = await issueRuntimeConnectionToken(
    createAppContext(),
    createTestActor({
      userId: admin.userId!,
      citizen: admin,
      adminMode: true,
    }),
    { runtime_id: RUNTIME_ID },
  );
  const authenticate = () =>
    authenticateRuntimeConnection(createRelayContext(), {
      token,
      runtime_id: RUNTIME_ID,
      runtime_kind: RuntimeKind.browser,
    });

  expect((await authenticate()).actor.adminMode).toBe(true);

  await prisma.user.update({
    where: { id: admin.userId! },
    data: { role: null },
  });
  await expect(authenticate()).rejects.toThrow(ForbiddenError);
});

test("refuses a user without the permission, an admin who assumes the user and a banned user, also at the renewal of a valid token", async () => {
  const owner = await createOwner();
  const { token } = await issueRuntimeConnectionToken(
    createAppContext(),
    owner.actor,
    { runtime_id: RUNTIME_ID },
  );
  const withoutPermission = createTestActor({
    userId: owner.citizen.userId!,
    citizen: owner.citizen,
    permissionStrings: ["login;manage"],
  });

  await expect(
    issueRuntimeConnectionToken(createAppContext(), withoutPermission, {
      runtime_id: RUNTIME_ID,
    }),
  ).rejects.toThrow(
    new ForbiddenError(RemoteControlProgramErrorMessage.PermissionMissing),
  );
  // The runtime would upload the log of the admin as the data of the user
  await expect(
    issueRuntimeConnectionToken(
      createAppContext(),
      createTestActor({
        userId: owner.citizen.userId!,
        citizen: owner.citizen,
        permissionStrings: ["login;manage", "remoteControlProgram;use"],
        assumedByAdminId: "admin-user",
      }),
      { runtime_id: RUNTIME_ID },
    ),
  ).rejects.toThrow(
    new ForbiddenError(RemoteControlProgramErrorMessage.AssumedUser),
  );

  await prisma.roleAssignment.deleteMany({
    where: { citizenId: owner.citizen.id, roleId: owner.useRoleId },
  });
  await expect(
    authenticateRuntimeConnection(createRelayContext(), {
      token,
      runtime_id: RUNTIME_ID,
      runtime_kind: RuntimeKind.browser,
    }),
  ).rejects.toThrow(
    new ForbiddenError(RemoteControlProgramErrorMessage.PermissionMissing),
  );

  await prisma.user.update({
    where: { id: owner.citizen.userId! },
    data: { bannedAt: TEST_NOW },
  });
  await expect(
    issueRuntimeConnectionToken(createAppContext(), owner.actor, {
      runtime_id: RUNTIME_ID,
    }),
  ).rejects.toThrow(
    new ForbiddenError(RemoteControlProgramErrorMessage.UserBanned),
  );
  await expect(
    authenticateRuntimeConnection(createRelayContext(), {
      token,
      runtime_id: RUNTIME_ID,
      runtime_kind: RuntimeKind.browser,
    }),
  ).rejects.toThrow(
    new ForbiddenError(RemoteControlProgramErrorMessage.UserBanned),
  );
});
