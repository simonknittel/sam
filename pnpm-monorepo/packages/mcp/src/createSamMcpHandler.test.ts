import {
  CLIENT_CAPABILITIES_META_KEY,
  CLIENT_INFO_META_KEY,
  PROTOCOL_VERSION_META_KEY,
  type CallToolResult,
  type DiscoverResult,
  type ListToolsResult,
} from "@modelcontextprotocol/server";
import {
  createActor,
  ForbiddenError,
  type ApplicationContext,
} from "@sam-monorepo/application";
import { afterEach, describe, expect, test, vi } from "vitest";
import { listToolCatalog } from "./catalog.js";
import {
  createSamMcpHandler,
  toAuthInfoExtra,
  type McpPrincipalExtra,
} from "./createSamMcpHandler.js";
import { getCurrentUserTool } from "./tools/account/getCurrentUser.js";

/**
 * The revision of the protocol that the endpoint serves. The SDK exports only
 * the constant of the legacy revisions.
 */
const PROTOCOL_VERSION = "2026-07-28";

const ENDPOINT_URL = "http://localhost/api/mcp";

const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

/** `withSpan()` uses only `startActiveSpan()`, `setStatus()` and `end()` */
const span = { setStatus: () => span, end: () => undefined };

const baseUrl = new URL("http://localhost");

/** The tools of these tests use only the logger, the tracer and the URLs */
const context = {
  log,
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
  permissionSets: [{ resource: "login", operation: "manage" }],
  adminMode: false,
});

/**
 * The tests look only at `get_current_user`. The other tools of the catalog
 * are disabled, thus a new tool that every user sees does not change the
 * expectations.
 */
const OTHER_TOOL_NAMES = listToolCatalog()
  .map((tool) => tool.name)
  .filter((name) => name !== "get_current_user");

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
    },
    principal,
  );

const callGetCurrentUser = (principal?: Partial<McpPrincipalExtra>) =>
  sendModernRequest<CallToolResult>(
    "tools/call",
    { name: "get_current_user", arguments: {} },
    principal,
  );

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("discovery", () => {
  test("server/discover gives the instructions and the tools capability", async () => {
    const { status, body } =
      await sendModernRequest<DiscoverResult>("server/discover");

    expect(status).toBe(200);
    expect(body.result?.supportedVersions).toEqual([PROTOCOL_VERSION]);
    expect(body.result?.capabilities.tools).toEqual({ listChanged: false });
    expect(body.result?.instructions).toContain("http://localhost/app/mcp");
  });

  test("tools/list gives get_current_user with its annotations and its output schema", async () => {
    const { body } = await sendModernRequest<ListToolsResult>("tools/list");

    expect(body.result?.tools).toEqual([
      expect.objectContaining({
        name: "get_current_user",
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
  test("get_current_user gives the structured content and the same JSON as text", async () => {
    const { body } = await callGetCurrentUser();

    expect(body.result?.isError).toBeUndefined();
    expect(body.result?.structuredContent).toEqual({
      user_id: "user",
      citizen: { id: "citizen", handle: "Handle" },
      role: "user",
      admin_mode: false,
      permission_count: 1,
      tool_groups: ["account"],
      settings_page_url: "http://localhost/app/mcp",
    });
    expect(body.result?.content).toEqual([
      { type: "text", text: JSON.stringify(body.result?.structuredContent) },
    ]);
    expect(log.info).toHaveBeenCalledWith("MCP tool call", {
      tool: "get_current_user",
      userId: "user",
      durationMs: expect.any(Number),
      isError: false,
    });
  });

  test("a disabled tool is not in the list and cannot be called", async () => {
    const principal = {
      disabledToolNames: [...OTHER_TOOL_NAMES, "get_current_user"],
    };

    const list = await sendModernRequest<ListToolsResult>(
      "tools/list",
      {},
      principal,
    );
    expect(list.body.result?.tools).toEqual([]);

    const call = await callGetCurrentUser(principal);
    expect(call.body.error).toEqual({
      code: -32602,
      message: "Tool get_current_user not found",
    });
  });

  test("a typed error becomes a tool error with its message", async () => {
    vi.spyOn(getCurrentUserTool, "handler").mockRejectedValueOnce(
      new ForbiddenError("The permission event;read is missing"),
    );

    const { body } = await callGetCurrentUser();

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
  });

  test("an output with a field that the output schema does not name does not leave the server", async () => {
    const output = await getCurrentUserTool.handler(
      context,
      actor,
      {},
      { availableTools: [] },
    );
    vi.spyOn(getCurrentUserTool, "handler").mockResolvedValueOnce({
      ...output,
      email: "user@example.com",
    });

    const { body } = await callGetCurrentUser();

    expect(body.result).toMatchObject({
      isError: true,
      content: [
        { type: "text", text: "The tool failed. The error is logged." },
      ],
    });
    expect(JSON.stringify(body)).not.toContain("user@example.com");
    expect(log.error).toHaveBeenCalledWith("The MCP tool failed", {
      tool: "get_current_user",
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
    vi.spyOn(getCurrentUserTool, "handler").mockRejectedValueOnce(error);

    await callGetCurrentUser();

    expect(log.error).toHaveBeenCalledWith("The MCP tool failed", {
      tool: "get_current_user",
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
