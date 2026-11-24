import {
  CLIENT_CAPABILITIES_META_KEY,
  CLIENT_INFO_META_KEY,
  Client,
  PROTOCOL_VERSION_META_KEY,
  StreamableHTTPClientTransport,
  type CallToolResult,
  type DiscoverResult,
  type Tool,
} from "@modelcontextprotocol/client";
import { expect, type APIRequestContext } from "@playwright/test";

/**
 * The revision of the protocol that the MCP endpoint serves. The SDK exports
 * only the constants of the legacy revisions.
 */
export const MCP_PROTOCOL_VERSION = "2026-07-28";

export const MCP_ENDPOINT_PATH = "/api/mcp";

const CLIENT_INFO = { name: "sam-playwright", version: "1.0.0" };

export const UNKNOWN_TOOL_ERROR_CODE = -32602;

export const UNSUPPORTED_PROTOCOL_VERSION_ERROR_CODE = -32022;

export interface McpTestClient {
  readonly discover: () => Promise<DiscoverResult>;
  readonly listTools: () => Promise<Tool[]>;
  readonly listToolNames: () => Promise<string[]>;
  /**
   * A tool error (`isError`) is a result, an unknown tool rejects with a
   * `ProtocolError`.
   */
  readonly callTool: (
    name: string,
    toolArguments?: Record<string, unknown>,
  ) => Promise<CallToolResult>;
  readonly readResourceText: (uri: string) => Promise<string>;
  readonly close: () => Promise<void>;
}

/**
 * The pinned revision makes the client send the `_meta` envelope and the
 * `Mcp-*` headers with each request. After a `tools/list`, the SDK also
 * validates the structured content of each tool result with the output schema
 * of the tool.
 */
export const createMcpClient = async ({
  baseUrl,
  accessToken,
}: {
  readonly baseUrl: string;
  readonly accessToken: string;
}): Promise<McpTestClient> => {
  const client = new Client(CLIENT_INFO, {
    versionNegotiation: { mode: { pin: MCP_PROTOCOL_VERSION } },
  });
  await client.connect(
    new StreamableHTTPClientTransport(new URL(MCP_ENDPOINT_PATH, baseUrl), {
      authProvider: { token: () => Promise.resolve(accessToken) },
    }),
  );

  const listTools = async () => (await client.listTools()).tools;

  return {
    discover: () => client.discover(),
    listTools,
    listToolNames: async () => (await listTools()).map((tool) => tool.name),
    callTool: (name, toolArguments = {}) =>
      client.callTool({ name, arguments: toolArguments }),
    readResourceText: async (uri) => {
      const [content] = (await client.readResource({ uri })).contents;

      return content && "text" in content ? content.text : "";
    },
    close: () => client.close(),
  };
};

/** The SDK types `structuredContent` as each JSON value. */
export const structuredContentOf = (
  result: CallToolResult,
): Record<string, unknown> => {
  const content: unknown = result.structuredContent;
  if (typeof content !== "object" || content === null) return {};

  return Object.fromEntries(Object.entries(content));
};

export const toolResultText = (result: CallToolResult) =>
  result.content
    .flatMap((content) => (content.type === "text" ? [content.text] : []))
    .join("\n");

/** The text of a tool error starts with the name of the error of the use case */
export const CONFLICT_RESULT = /^ConflictError: /;
export const FORBIDDEN_RESULT = /^ForbiddenError: /;
export const NOT_FOUND_RESULT = /^NotFoundError: /;
export const VALIDATION_RESULT = /^ValidationError: /;

export const callForContent = async (
  client: McpTestClient,
  name: string,
  toolArguments?: Record<string, unknown>,
) => {
  const result = await client.callTool(name, toolArguments);
  expect(result.isError, toolResultText(result)).toBeFalsy();

  return structuredContentOf(result);
};

export const callForError = async (
  client: McpTestClient,
  name: string,
  toolArguments?: Record<string, unknown>,
) => {
  const result = await client.callTool(name, toolArguments);
  expect(result.isError).toBe(true);

  return toolResultText(result);
};

interface McpHttpRequest {
  readonly body: object;
  readonly headers: Readonly<Record<string, string>>;
}

/**
 * For the requests whose HTTP response a test examines, for example the status
 * code of a refused token.
 */
export const modernMcpRequest = (
  method: string,
  params: Readonly<Record<string, unknown>> = {},
): McpHttpRequest => ({
  body: {
    jsonrpc: "2.0",
    id: 1,
    method,
    params: {
      ...params,
      _meta: {
        [PROTOCOL_VERSION_META_KEY]: MCP_PROTOCOL_VERSION,
        [CLIENT_INFO_META_KEY]: CLIENT_INFO,
        [CLIENT_CAPABILITIES_META_KEY]: {},
      },
    },
  },
  headers: {
    "Mcp-Protocol-Version": MCP_PROTOCOL_VERSION,
    "Mcp-Method": method,
  },
});

export const LEGACY_INITIALIZE_REQUEST: McpHttpRequest = {
  body: {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-11-25",
      capabilities: {},
      clientInfo: CLIENT_INFO,
    },
  },
  headers: {},
};

export const postMcpEndpoint = (
  request: APIRequestContext,
  { body, headers }: McpHttpRequest,
  accessToken?: string,
) =>
  request.post(MCP_ENDPOINT_PATH, {
    headers: {
      Accept: "application/json, text/event-stream",
      ...headers,
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
    },
    data: body,
  });
