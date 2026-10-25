import type { CallToolResult, McpServer } from "@modelcontextprotocol/server";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  withSpan,
  type Actor,
  type ApplicationContext,
} from "@sam-monorepo/application";
import * as z from "zod";
import { TOOL_CATALOG, toToolCatalogEntry } from "./catalog.js";
import type { CatalogTool, ToolRequestScope } from "./toolDefinition.js";

export interface RegisterToolsOptions {
  /** The tools that the user disabled for the client of the request */
  readonly disabledToolNames: readonly string[];
}

/**
 * Registers the tools that the actor can use: the tools that are visible for
 * the actor and that the user did not disable. The order of the registration
 * is the order of `tools/list`.
 */
export const registerTools = (
  server: McpServer,
  context: ApplicationContext,
  actor: Actor,
  { disabledToolNames }: RegisterToolsOptions,
) => {
  const disabledNames = new Set(disabledToolNames);
  const tools = TOOL_CATALOG.filter(
    (tool) => !disabledNames.has(tool.name) && tool.isVisible(actor),
  );
  const scope: ToolRequestScope = {
    availableTools: tools.map(toToolCatalogEntry),
  };

  for (const tool of tools) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema,
        outputSchema: tool.outputSchema,
        annotations: tool.annotations,
      },
      (input) => callTool(tool, context, actor, input, scope),
    );
  }
};

const callTool = async (
  tool: CatalogTool,
  context: ApplicationContext,
  actor: Actor,
  input: Record<string, unknown>,
  scope: ToolRequestScope,
): Promise<CallToolResult> => {
  const startedAt = performance.now();

  const result = await withSpan(
    context,
    `mcp.tool ${tool.name}`,
    async (): Promise<CallToolResult> => {
      const output = tool.outputSchema.parse(
        await tool.handler(context, actor, input, scope),
      );

      return {
        content: [{ type: "text", text: JSON.stringify(output) }],
        structuredContent: output,
      };
    },
  ).catch((error: unknown) => toErrorResult(tool, context, actor, error));

  if (tool.readAuditEventType && result.isError !== true)
    await context.audit.create([
      {
        type: tool.readAuditEventType,
        // Gives the dates of the parsed arguments as ISO strings
        data: { arguments: JSON.parse(JSON.stringify(input)) },
        createdById: actor.userId,
      },
    ]);

  // Never log the arguments or the output: they can contain personal data
  context.log.info("MCP tool call", {
    tool: tool.name,
    userId: actor.userId,
    durationMs: Math.round(performance.now() - startedAt),
    isError: result.isError === true,
  });

  return result;
};

const toErrorResult = (
  tool: CatalogTool,
  context: ApplicationContext,
  actor: Actor,
  error: unknown,
): CallToolResult => {
  if (
    error instanceof ForbiddenError ||
    error instanceof NotFoundError ||
    error instanceof ConflictError ||
    error instanceof ValidationError
  )
    return createErrorResult(`${error.name}: ${error.message}`);

  // Also an output that does not agree with the output schema
  context.log.error("The MCP tool failed", {
    tool: tool.name,
    userId: actor.userId,
    ...toLoggableError(error),
  });

  return createErrorResult("The tool failed. The error is logged.");
};

/**
 * The message of an error can contain personal data, for example the
 * arguments of a Prisma query. Thus the log record gets only the name, the
 * code (for example the Prisma error code `P2002`) and the frames of the stack.
 * The first lines of a stack repeat the message, thus they are removed. An
 * output that does not agree with the output schema also gives the codes and
 * the paths of its issues, without the values.
 */
const toLoggableError = (error: unknown) => {
  if (!(error instanceof Error)) return { errorName: typeof error };

  return {
    errorName: error.name,
    ...(error instanceof z.ZodError
      ? {
          issues: error.issues.map(({ code, path }) => ({
            code,
            path: path.map(String).join("."),
          })),
        }
      : {}),
    ...("code" in error && typeof error.code === "string"
      ? { errorCode: error.code }
      : {}),
    stack: error.stack
      ?.split("\n")
      .filter((line) => line.trimStart().startsWith("at "))
      .join("\n"),
  };
};

const createErrorResult = (text: string): CallToolResult => ({
  content: [{ type: "text", text }],
  isError: true,
});
