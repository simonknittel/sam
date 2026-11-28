import { prisma } from "@sam-monorepo/database";
import { AuditEventType, RuntimeKind } from "@sam-monorepo/domain";
import { createLocalJWKSet } from "jose";
import { createHash, randomBytes } from "node:crypto";
import { beforeEach, expect, test } from "vitest";
import {
  createTestActor,
  createTestApplicationContext,
  TEST_NOW,
} from "../../../test/applicationContext.js";
import { truncateAllTables } from "../../../test/database.js";
import { createTestRelayService } from "../../../test/relayService.js";
import { createClearedCitizen } from "../../../test/remoteControlProgram.js";
import { createTestSigningKey } from "../../../test/signingKey.js";
import type { Actor } from "../../actor.js";
import { SIGNING_KEY_ALGORITHM, type SigningKey } from "../../context.js";
import { ForbiddenError } from "../../errors.js";
import { listOwnGrants } from "../../mcpSettings/listOwnGrants.js";
import { verifyAccessToken } from "../../oauth/accessToken.js";
import { createGrantWithAuthorizationCode } from "../../oauth/createGrantWithAuthorizationCode.js";
import { getDesktopCompanionClientId } from "../../oauth/desktopCompanionClient.js";
import {
  InvalidTokenError,
  OAuthTokenError,
  OAuthTokenErrorCode,
} from "../../oauth/errors.js";
import { redeemAuthorizationCode } from "../../oauth/redeemAuthorizationCode.js";
import { refreshAccessToken } from "../../oauth/refreshAccessToken.js";
import { OAuthResource } from "../../oauth/resources.js";
import {
  AuthorizationErrorCode,
  AuthorizationRequestValidationKind,
  validateAuthorizationRequest,
} from "../../oauth/validateAuthorizationRequest.js";
import { RemoteControlProgramErrorMessage } from "../access/remoteControlProgramErrors.js";
import { authenticateRuntimeConnection } from "../runtimes/authenticateRuntimeConnection.js";
import {
  authenticateDesktopCompanion,
  issueDesktopCompanionConnectionToken,
  issueRuntimeConnectionToken,
} from "../runtimes/issueRuntimeConnectionToken.js";
import { listOwnDesktopCompanionSignIns } from "./listOwnDesktopCompanionSignIns.js";
import { revokeOwnDesktopCompanionSignIn } from "./revokeOwnDesktopCompanionSignIn.js";

const RUNTIME_ID = "0b6f1d3e-2a4c-4e8f-9a1b-3c5d7e9f1a2b";

/** The program listens on a random port of the loopback interface */
const REDIRECT_URI = "http://127.0.0.1:53682/callback";

const REMOTE_CONTROL_PROGRAM_RESOURCE =
  "https://sam.example.com/api/remote-control-program";

const OWNER_PERMISSIONS = ["login;manage", "remoteControlProgram;use"];

const MCP_CLIENT_ID = "https://client.example.com/oauth/metadata.json";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";

let signingKey: SigningKey;

beforeEach(async () => {
  await truncateAllTables();
  signingKey = await createTestSigningKey();
});

/** The app: it signs the tokens */
const createAppContext = () =>
  createTestApplicationContext({
    signingKey: async () => signingKey,
    relay: createTestRelayService().relay,
  });

/** The relay service: no signing key, the key set of the app */
const createRelayContext = () =>
  createTestApplicationContext({
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

const createOwner = async (permissionStrings = OWNER_PERMISSIONS) => {
  const citizen = await createClearedCitizen("owner", permissionStrings);

  return createTestActor({
    userId: citizen.userId!,
    citizen,
    permissionStrings,
  });
};

const createPkcePair = () => {
  const verifier = randomBytes(32).toString("base64url");

  return {
    verifier,
    challenge: createHash("sha256").update(verifier).digest("base64url"),
  };
};

const createAuthorizationParameters = (
  clientId: string,
  redirectUri: string,
  codeChallenge: string,
) => ({
  response_type: "code",
  client_id: clientId,
  redirect_uri: redirectUri,
  code_challenge: codeChallenge,
  code_challenge_method: "S256",
  state: "state",
  scope: "remote_control_program",
  resource: REMOTE_CONTROL_PROGRAM_RESOURCE,
});

/** The login of the program up to the token response, like the program does it */
const signInDesktopCompanion = async (actor: Actor) => {
  const { context } = createAppContext();
  const clientId = getDesktopCompanionClientId(context);
  const pkce = createPkcePair();

  const validation = await validateAuthorizationRequest(
    context,
    createAuthorizationParameters(clientId, REDIRECT_URI, pkce.challenge),
  );
  if (validation.kind !== AuthorizationRequestValidationKind.Valid)
    throw new Error(`The request is not valid: ${validation.kind}`);

  expect(validation).toMatchObject({
    client: { clientId, clientName: "SAM Desktop Companion" },
    redirectUri: REDIRECT_URI,
    scope: "remote_control_program",
    resource: REMOTE_CONTROL_PROGRAM_RESOURCE,
    oauthResource: OAuthResource.RemoteControlProgram,
  });

  const { code } = await createGrantWithAuthorizationCode(context, actor, {
    ...validation,
    customName: null,
    disabledToolNames: [],
    userAgent: USER_AGENT,
  });

  return {
    clientId,
    tokens: await redeemAuthorizationCode(context, {
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      client_id: clientId,
      code_verifier: pkce.verifier,
      resource: REMOTE_CONTROL_PROGRAM_RESOURCE,
    }),
  };
};

test("the desktop companion signs in, connects as a runtime of the owner, and the sign-out stops the next renewal", async () => {
  const owner = await createOwner();
  const { context, auditEvents } = createAppContext();
  const { clientId, tokens } = await signInDesktopCompanion(owner);

  expect(tokens.scope).toBe("remote_control_program");
  // The MCP endpoint refuses the access token
  await expect(
    verifyAccessToken(context, tokens.access_token, OAuthResource.Mcp),
  ).rejects.toThrow(InvalidTokenError);
  // The app KI-Agenten lists only the grants of the MCP server
  expect(await listOwnGrants(context, owner)).toEqual([]);

  const issued = await issueDesktopCompanionConnectionToken(
    context,
    await authenticateDesktopCompanion(context, tokens.access_token),
    { runtime_id: RUNTIME_ID },
  );
  expect(issued).toMatchObject({
    relayUrl: "wss://relay.example.com/",
    citizenId: owner.citizen?.id,
    handle: "owner",
  });

  const authenticate = (runtimeKind: RuntimeKind) =>
    authenticateRuntimeConnection(createRelayContext(), {
      token: issued.token,
      runtime_id: RUNTIME_ID,
      runtime_kind: runtimeKind,
    });

  const connection = await authenticate(RuntimeKind.desktop_companion);
  expect(connection).toMatchObject({
    userId: owner.userId,
    runtimeKind: RuntimeKind.desktop_companion,
    actor: { adminMode: false },
  });
  await expect(authenticate(RuntimeKind.browser)).rejects.toThrow(
    new ForbiddenError(
      RemoteControlProgramErrorMessage.ConnectionTokenNotValid,
    ),
  );

  const { signIns } = await listOwnDesktopCompanionSignIns(context, owner);
  expect(signIns).toEqual([
    {
      id: expect.any(String),
      userAgent: USER_AGENT,
      createdAt: expect.any(Date),
      lastUsedAt: TEST_NOW,
    },
  ]);

  const grantId = signIns[0]!.id;
  expect(
    await revokeOwnDesktopCompanionSignIn(context, owner, {
      grant_id: grantId,
    }),
  ).toEqual({ isChanged: true });
  expect(
    await revokeOwnDesktopCompanionSignIn(context, owner, {
      grant_id: grantId,
    }),
  ).toEqual({ isChanged: false });

  // The renewal with the token from before the sign-out closes the connection
  await expect(authenticate(RuntimeKind.desktop_companion)).rejects.toThrow(
    new ForbiddenError(RemoteControlProgramErrorMessage.OAuthGrantRevoked),
  );
  await expect(
    authenticateDesktopCompanion(context, tokens.access_token),
  ).rejects.toThrow(InvalidTokenError);
  await expect(
    refreshAccessToken(context, {
      grant_type: "refresh_token",
      refresh_token: tokens.refresh_token,
      client_id: clientId,
    }),
  ).rejects.toThrow(OAuthTokenError);
  expect(await listOwnDesktopCompanionSignIns(context, owner)).toEqual({
    signIns: [],
  });
  // The second sign-out changed nothing
  expect(auditEvents.map((event) => event.type)).toEqual([
    AuditEventType.OAUTH_GRANT_REVOKED,
  ]);
});

test("only the desktop companion gets the resource of the Remote Control Program, and a browser runtime gets no token of it", async () => {
  const owner = await createOwner();
  const { context } = createAppContext();
  const { challenge } = createPkcePair();
  await prisma.oAuthClientMetadata.create({
    data: {
      clientId: MCP_CLIENT_ID,
      document: {},
      clientName: "MCP client",
      redirectUris: ["https://client.example.com/callback"],
      fetchedAt: TEST_NOW,
      expiresAt: new Date(TEST_NOW.getTime() + 60 * 60 * 1000),
    },
  });

  expect(
    await validateAuthorizationRequest(
      context,
      createAuthorizationParameters(
        MCP_CLIENT_ID,
        "https://client.example.com/callback",
        challenge,
      ),
    ),
  ).toMatchObject({
    kind: AuthorizationRequestValidationKind.RedirectError,
    error: AuthorizationErrorCode.InvalidTarget,
  });

  // The connection token of a session is only for a browser runtime
  const { token } = await issueRuntimeConnectionToken(context, owner, {
    runtime_id: RUNTIME_ID,
  });
  await expect(
    authenticateRuntimeConnection(createRelayContext(), {
      token,
      runtime_id: RUNTIME_ID,
      runtime_kind: RuntimeKind.desktop_companion,
    }),
  ).rejects.toThrow(
    new ForbiddenError(
      RemoteControlProgramErrorMessage.ConnectionTokenNotValid,
    ),
  );
});

test("the consent of the desktop companion needs remoteControlProgram;use, also for an admin in admin mode", async () => {
  const mcpUser = await createOwner(["login;manage", "mcp;use"]);
  await expect(signInDesktopCompanion(mcpUser)).rejects.toThrow(
    new ForbiddenError(RemoteControlProgramErrorMessage.PermissionMissing),
  );

  const admin = createTestActor({
    userId: mcpUser.userId,
    citizen: mcpUser.citizen,
    permissionStrings: ["login;manage"],
    adminMode: true,
  });
  await expect(signInDesktopCompanion(admin)).rejects.toThrow(
    new ForbiddenError(RemoteControlProgramErrorMessage.PermissionMissing),
  );
  expect(await prisma.oAuthGrant.count()).toBe(0);
});

test("a refresh keeps the scope of the grant, and ignores the scope of the other resource", async () => {
  const owner = await createOwner();
  const { context } = createAppContext();
  const { clientId, tokens } = await signInDesktopCompanion(owner);

  const refreshed = await refreshAccessToken(context, {
    grant_type: "refresh_token",
    refresh_token: tokens.refresh_token,
    client_id: clientId,
    scope: "mcp remote_control_program offline_access",
  });
  expect(refreshed.scope).toBe("remote_control_program");

  await expect(
    refreshAccessToken(context, {
      grant_type: "refresh_token",
      refresh_token: refreshed.refresh_token,
      client_id: clientId,
      scope: "unknown",
    }),
  ).rejects.toMatchObject({ error: OAuthTokenErrorCode.InvalidScope });
});
