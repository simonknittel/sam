import {
  CLIENT_CAPABILITIES_META_KEY,
  CLIENT_INFO_META_KEY,
  PROTOCOL_VERSION_META_KEY,
  type CallToolResult,
} from "@modelcontextprotocol/server";
import {
  issueAccessToken,
  type ApplicationContext,
  type SigningKey,
} from "@sam-monorepo/application";
import { generateKeyPairSync } from "node:crypto";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createMcpRequestHandler } from "./createMcpRequestHandler.js";

/** The SDK exports only the constant of the legacy revisions */
const PROTOCOL_VERSION = "2026-07-28";

const CLIENT_ID = "https://client.example.com/client.json";

const baseUrl = new URL("http://localhost");
const mcpResourceUrl = new URL("/api/mcp", baseUrl);

/** A P-256 key like the key of `EMBED_JWT_PRIVATE_KEY` */
const signingKey: SigningKey = {
  privateKey: generateKeyPairSync("ec", { namedCurve: "P-256" }).privateKey,
  // Only the JWKS uses the public key and the key id
  publicJwk: {},
  keyId: "key",
  algorithm: "ES256",
};

/** The columns of the grant and its user that `resolvePrincipal()` selects */
const createGrantRow = () => ({
  id: "grant",
  userId: "user",
  clientId: CLIENT_ID,
  clientName: "Client",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  lastUsedAt: null as Date | null,
  revokedAt: null as Date | null,
  adminModeEnabledAt: null,
  toolSettings: [],
  user: {
    role: null,
    emailVerified: new Date("2026-01-01T00:00:00Z"),
    bannedAt: null,
    citizen: { id: "citizen", handle: "Handle" },
    accounts: [],
  },
});

let grantRow = createGrantRow();
let permissionStrings = ["login;manage", "mcp;use"];

const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

/** `withSpan()` uses only `startActiveSpan()`, `setStatus()` and `end()` */
const span = { setStatus: () => span, end: () => undefined };

/** Only the queries of the principal */
const prisma = {
  oAuthGrant: {
    findUnique: () => Promise.resolve(grantRow),
    updateMany: () => Promise.resolve({ count: 1 }),
  },
  roleAssignment: {
    findMany: () =>
      Promise.resolve([
        {
          currentLevel: null,
          role: {
            id: "role",
            maxLevel: null,
            permissionStrings: permissionStrings.map((permissionString) => ({
              permissionString,
            })),
            inherits: [],
          },
        },
      ]),
  },
};

const context = {
  prisma,
  log,
  audit: { create: () => Promise.resolve() },
  tracer: {
    startActiveSpan: (_name: string, callback: (span: unknown) => unknown) =>
      callback(span),
  },
  now: () => new Date(),
  urls: {
    baseUrl,
    issuer: baseUrl.origin,
    mcpResourceUrl,
    publicUploadBaseUrl: baseUrl.origin,
  },
  signingKey: () => Promise.resolve(signingKey),
} as unknown as ApplicationContext;

const handleRequest = createMcpRequestHandler({
  serverVersion: "1.0.0",
  onerror: () => undefined,
});

const issueToken = () =>
  issueAccessToken(context, {
    id: "grant",
    userId: "user",
    clientId: CLIENT_ID,
    scope: "mcp",
  });

/** A `tools/call` of `get_current_user` in the 2026-07-28 revision */
const callGetCurrentUser = (headers: Record<string, string>) =>
  handleRequest(
    context,
    new Request(mcpResourceUrl, {
      method: "POST",
      headers: {
        host: "localhost",
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        "mcp-protocol-version": PROTOCOL_VERSION,
        "mcp-method": "tools/call",
        "mcp-name": "get_current_user",
        ...headers,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "get_current_user",
          arguments: {},
          _meta: {
            [PROTOCOL_VERSION_META_KEY]: PROTOCOL_VERSION,
            [CLIENT_INFO_META_KEY]: { name: "test", version: "1.0.0" },
            [CLIENT_CAPABILITIES_META_KEY]: {},
          },
        },
      }),
    }),
  );

const callWithToken = async () =>
  callGetCurrentUser({ authorization: `Bearer ${await issueToken()}` });

beforeEach(() => {
  grantRow = createGrantRow();
  permissionStrings = ["login;manage", "mcp;use"];
});

describe("authentication", () => {
  test("a request without a token gets the challenge with the metadata URL and the scope", async () => {
    const response = await callGetCurrentUser({});

    expect(response.status).toBe(401);
    const challenge = response.headers.get("www-authenticate");
    expect(challenge).toContain('error="invalid_token"');
    expect(challenge).toContain('scope="mcp"');
    expect(challenge).toContain(
      'resource_metadata="http://localhost/.well-known/oauth-protected-resource/api/mcp"',
    );
  });

  test("a valid token reaches the tools with the actor of its grant", async () => {
    const response = await callWithToken();

    expect(response.status).toBe(200);
    const body = (await response.json()) as { result: CallToolResult };
    expect(body.result.structuredContent).toMatchObject({
      user_id: "user",
      citizen: { id: "citizen", handle: "Handle" },
    });
  });

  test("a token of a revoked grant gets the invalid_token challenge", async () => {
    grantRow.revokedAt = new Date();

    const response = await callWithToken();

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain(
      'error="invalid_token"',
    );
  });

  test("a user without the clearance gets 403 without a challenge", async () => {
    permissionStrings = [];

    const response = await callWithToken();

    expect(response.status).toBe(403);
    expect(response.headers.get("www-authenticate")).toBeNull();
    expect(await response.json()).toEqual({
      error: "forbidden",
      error_description: "The user has no access to the app",
    });
  });

  test("a user without the permission to use the MCP server gets 403 without a challenge", async () => {
    permissionStrings = ["login;manage"];

    const response = await callWithToken();

    expect(response.status).toBe(403);
    expect(response.headers.get("www-authenticate")).toBeNull();
  });

  test("a request with the host of a different site is refused before the token check", async () => {
    const response = await callGetCurrentUser({ host: "attacker.example" });

    expect(response.status).toBe(403);
    expect(response.headers.get("www-authenticate")).toBeNull();
  });
});
