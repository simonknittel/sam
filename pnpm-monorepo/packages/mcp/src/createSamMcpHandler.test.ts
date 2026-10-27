import {
  CLIENT_CAPABILITIES_META_KEY,
  CLIENT_INFO_META_KEY,
  PROTOCOL_VERSION_META_KEY,
  type CallToolResult,
  type DiscoverResult,
  type ListToolsResult,
  type ReadResourceResult,
} from "@modelcontextprotocol/server";
import {
  createActor,
  ForbiddenError,
  type ApplicationContext,
} from "@sam-monorepo/application";
import { AuditEventType } from "@sam-monorepo/domain";
import { createHash } from "node:crypto";
import { afterEach, describe, expect, test, vi } from "vitest";
import { listToolCatalog } from "./catalog.js";
import {
  createSamMcpHandler,
  toAuthInfoExtra,
  type McpPrincipalExtra,
} from "./createSamMcpHandler.js";
import { getUserTool } from "./tools/users/getUser.js";

/**
 * The revision of the protocol that the endpoint serves. The SDK exports only
 * the constant of the legacy revisions.
 */
const PROTOCOL_VERSION = "2026-07-28";

const ENDPOINT_URL = "http://localhost/api/mcp";

const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

const audit = { create: vi.fn() };

/** `withSpan()` uses only `startActiveSpan()`, `setStatus()` and `end()` */
const span = { setStatus: () => span, end: () => undefined };

const baseUrl = new URL("http://localhost");

/** The columns of the user that `get_user` selects */
const USER_ROW = {
  id: "user",
  name: "Name",
  email: "user@example.com",
  emailVerified: new Date("2026-01-01T00:00:00Z"),
  createdAt: new Date("2025-12-01T00:00:00Z"),
  role: null,
  discordTwoFactorEnabled: null,
  bannedAt: null,
  bannedReason: null,
  bannedBy: null,
  accounts: [{ providerAccountId: "1234" }],
  citizen: { id: "citizen", handle: "Handle", deletedAt: null },
};

/**
 * The tool of these tests uses only the user query, the logger, the tracer
 * and the URLs. The registry writes the audit event of a read tool.
 */
const context = {
  prisma: { user: { findUnique: () => Promise.resolve(USER_ROW) } },
  log,
  audit,
  tracer: {
    startActiveSpan: (_name: string, callback: (span: unknown) => unknown) =>
      callback(span),
  },
  urls: {
    baseUrl,
    issuer: baseUrl.origin,
    mcpResourceUrl: new URL("/api/mcp", baseUrl),
    publicUploadBaseUrl: baseUrl.origin,
  },
} as unknown as ApplicationContext;

const actor = createActor({
  userId: "user",
  userRole: null,
  emailConfirmedAt: new Date("2026-01-01T00:00:00Z"),
  citizen: { id: "citizen", handle: "Handle" },
  roleIds: new Set(),
  discordUserId: null,
  discordTwoFactorEnabled: null,
  permissionSets: [{ resource: "login", operation: "manage" }],
  adminMode: false,
});

/**
 * The tests look only at `get_user`. The other tools of the catalog are
 * disabled, thus a new tool that every user sees does not change the
 * expectations.
 */
const OTHER_TOOL_NAMES = listToolCatalog()
  .map((tool) => tool.name)
  .filter((name) => name !== "get_user");

const handler = createSamMcpHandler({
  serverVersion: "1.0.0",
  onerror: () => undefined,
});

/** A JSON-RPC response has a result or an error */
interface JsonRpcResponseBody<Result> {
  readonly result?: Result;
  readonly error?: { readonly code: number; readonly message: string };
}

const send = async <Result>(
  body: object,
  headers: Record<string, string>,
  principal: Partial<McpPrincipalExtra> = {},
) => {
  const response = await handler.fetch(
    new Request(ENDPOINT_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        ...headers,
      },
      body: JSON.stringify(body),
    }),
    {
      authInfo: {
        token: "token",
        clientId: "https://client.example.com/client.json",
        scopes: ["mcp"],
        extra: toAuthInfoExtra({
          context,
          actor,
          disabledToolNames: OTHER_TOOL_NAMES,
          ...principal,
        }),
      },
    },
  );

  return {
    status: response.status,
    body: (await response.json()) as JsonRpcResponseBody<Result>,
  };
};

/** A request of the 2026-07-28 revision with its envelope and its headers */
const sendModernRequest = <Result>(
  method: string,
  params: Record<string, unknown> = {},
  principal?: Partial<McpPrincipalExtra>,
) =>
  send<Result>(
    {
      jsonrpc: "2.0",
      id: 1,
      method,
      params: {
        ...params,
        _meta: {
          [PROTOCOL_VERSION_META_KEY]: PROTOCOL_VERSION,
          [CLIENT_INFO_META_KEY]: { name: "test", version: "1.0.0" },
          [CLIENT_CAPABILITIES_META_KEY]: {},
        },
      },
    },
    {
      "mcp-protocol-version": PROTOCOL_VERSION,
      "mcp-method": method,
      ...(typeof params.name === "string" && { "mcp-name": params.name }),
      ...(method === "resources/read" &&
        typeof params.uri === "string" && { "mcp-name": params.uri }),
    },
    principal,
  );

const callGetUser = (principal?: Partial<McpPrincipalExtra>) =>
  sendModernRequest<CallToolResult>(
    "tools/call",
    { name: "get_user", arguments: {} },
    principal,
  );

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("discovery", () => {
  test("server/discover gives the instructions, the capabilities and the skills extension", async () => {
    const { status, body } =
      await sendModernRequest<DiscoverResult>("server/discover");

    expect(status).toBe(200);
    expect(body.result?.supportedVersions).toEqual([PROTOCOL_VERSION]);
    expect(body.result?.capabilities).toMatchObject({
      tools: { listChanged: false },
      resources: { listChanged: false },
      extensions: { "io.modelcontextprotocol/skills": {} },
    });
    expect(body.result?.instructions).toContain(
      "skill://sam-overview/SKILL.md",
    );
  });

  test("tools/list gives get_user with its annotations and its output schema", async () => {
    const { body } = await sendModernRequest<ListToolsResult>("tools/list");

    expect(body.result?.tools).toEqual([
      expect.objectContaining({
        name: "get_user",
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
        outputSchema: expect.objectContaining({
          type: "object",
          additionalProperties: false,
        }),
      }),
    ]);
  });

  test("a request of the legacy initialize handshake gets the unsupported-protocol-version error", async () => {
    const { status, body } = await send(
      {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-11-25",
          capabilities: {},
          clientInfo: { name: "test", version: "1.0.0" },
        },
      },
      {},
    );

    expect(status).toBe(400);
    expect(body.error?.code).toBe(-32022);
  });
});

describe("tools/call", () => {
  test("get_user without a user id gives the signed-in user with a redacted email address and this client, as structured content and as the same JSON text", async () => {
    const { body } = await callGetUser();

    expect(body.result?.isError).toBeUndefined();
    expect(body.result?.structuredContent).toEqual({
      id: "user",
      name: "Name",
      email: "u***r@e***e.com",
      email_verified_at: "2026-01-01T00:00:00.000Z",
      created_at: "2025-12-01T00:00:00.000Z",
      role: "user",
      discord_id: "1234",
      discord_two_factor_enabled: null,
      citizen: { id: "citizen", handle: "Handle" },
      ban: null,
      client: {
        admin_mode: false,
        permission_count: 1,
        tool_groups: ["users"],
        settings_page_url: "http://localhost/app/mcp",
      },
    });
    expect(body.result?.content).toEqual([
      { type: "text", text: JSON.stringify(body.result?.structuredContent) },
    ]);
    expect(log.info).toHaveBeenCalledWith("MCP tool call", {
      tool: "get_user",
      userId: "user",
      durationMs: expect.any(Number),
      isError: false,
    });
    expect(audit.create).toHaveBeenCalledExactlyOnceWith([
      {
        type: AuditEventType.USER_READ,
        data: { arguments: {} },
        createdById: "user",
      },
    ]);
  });

  test("a disabled tool is not in the list and cannot be called", async () => {
    const principal = {
      disabledToolNames: [...OTHER_TOOL_NAMES, "get_user"],
    };

    const list = await sendModernRequest<ListToolsResult>(
      "tools/list",
      {},
      principal,
    );
    expect(list.body.result?.tools).toEqual([]);

    const call = await callGetUser(principal);
    expect(call.body.error).toEqual({
      code: -32602,
      message: "Tool get_user not found",
    });
  });

  test("a typed error becomes a tool error with its message", async () => {
    vi.spyOn(getUserTool, "handler").mockRejectedValueOnce(
      new ForbiddenError("The permission event;read is missing"),
    );

    const { body } = await callGetUser();

    expect(body.result).toMatchObject({
      isError: true,
      content: [
        {
          type: "text",
          text: "ForbiddenError: The permission event;read is missing",
        },
      ],
    });
    expect(log.error).not.toHaveBeenCalled();
    // A failed read writes no audit event, like a failed write
    expect(audit.create).not.toHaveBeenCalled();
  });

  test("an output with a field that the output schema does not name does not leave the server", async () => {
    const output = await getUserTool.handler(
      context,
      actor,
      {},
      { availableTools: [] },
    );
    vi.spyOn(getUserTool, "handler").mockResolvedValueOnce({
      ...output,
      unredacted_email: "user@example.com",
    });

    const { body } = await callGetUser();

    expect(body.result).toMatchObject({
      isError: true,
      content: [
        { type: "text", text: "The tool failed. The error is logged." },
      ],
    });
    expect(JSON.stringify(body)).not.toContain("user@example.com");
    expect(log.error).toHaveBeenCalledWith("The MCP tool failed", {
      tool: "get_user",
      userId: "user",
      errorName: "ZodError",
      issues: [{ code: "unrecognized_keys", path: "" }],
      stack: expect.any(String),
    });
    expect(JSON.stringify(log.error.mock.calls)).not.toContain(
      "user@example.com",
    );
  });

  test("the log record of a failed tool has the code of the error, but not its message", async () => {
    const error = Object.assign(
      new Error("Unique constraint failed: user@example.com"),
      { code: "P2002" },
    );
    vi.spyOn(getUserTool, "handler").mockRejectedValueOnce(error);

    await callGetUser();

    expect(log.error).toHaveBeenCalledWith("The MCP tool failed", {
      tool: "get_user",
      userId: "user",
      errorName: "Error",
      errorCode: "P2002",
      stack: expect.any(String),
    });
    expect(JSON.stringify(log.error.mock.calls)).not.toContain(
      "user@example.com",
    );
  });
});

/** The fields of a cacheable result of the 2026-07-28 revision */
interface CacheableResult {
  readonly resultType: string;
  readonly ttlMs: number;
  readonly cacheScope: string;
}

interface SkillEntry {
  readonly uri: string;
  readonly frontmatter: Record<string, unknown>;
  readonly resources: readonly {
    readonly uri: string;
    readonly digest: string;
    readonly size: number;
  }[];
}

/** The skills write the values of the frontmatter as JSON strings */
const FRONTMATTER_PATTERN = /^---\nname: (.+)\ndescription: (.+)\n---\n/;

describe("skills", () => {
  test("each file of the manifest of skills/list agrees with its content from resources/read", async () => {
    const list = await sendModernRequest<
      CacheableResult & { readonly skills: readonly SkillEntry[] }
    >("skills/list");

    expect(list.body.result).toMatchObject({
      resultType: "complete",
      ttlMs: expect.any(Number),
      cacheScope: "public",
    });
    expect(list.body.result?.skills.length).toBeGreaterThan(0);

    for (const skill of list.body.result?.skills ?? []) {
      for (const resource of skill.resources) {
        const read = await sendModernRequest<ReadResourceResult>(
          "resources/read",
          { uri: resource.uri },
        );
        const [content] = read.body.result?.contents ?? [];
        const text = content && "text" in content ? content.text : "";
        const bytes = new TextEncoder().encode(text);

        expect(content?.mimeType).toBe("text/markdown");
        expect(bytes.byteLength).toBe(resource.size);
        expect(
          `sha256:${createHash("sha256").update(bytes).digest("hex")}`,
        ).toBe(resource.digest);

        if (resource.uri === skill.uri) {
          const [, name, description] = FRONTMATTER_PATTERN.exec(text) ?? [];
          expect(skill.frontmatter).toEqual({
            name: JSON.parse(name ?? "null"),
            description: JSON.parse(description ?? "null"),
          });
          expect(skill.uri).toBe(`skill://${skill.frontmatter.name}/SKILL.md`);
        }
      }
    }
  });

  test("skills/get gives the entry of skills/list, and an unknown URI gives an invalid-params error", async () => {
    const list = await sendModernRequest<{
      readonly skills: readonly SkillEntry[];
    }>("skills/list");
    const [skill] = list.body.result?.skills ?? [];

    const get = await sendModernRequest<
      CacheableResult & { readonly skill: SkillEntry }
    >("skills/get", { uri: skill?.uri });
    expect(get.body.result).toMatchObject({
      resultType: "complete",
      cacheScope: "public",
      skill,
    });

    const unknown = await sendModernRequest("skills/get", {
      uri: "skill://unknown/SKILL.md",
    });
    expect(unknown.body.error?.code).toBe(-32602);
  });
});
