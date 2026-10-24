import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { requireMcpAccess } from "../mcpAccess.js";
import { withSpan } from "../withSpan.js";

/** The names of the MCP tools are lowercase snake_case */
const MAXIMUM_TOOL_NAME_LENGTH = 64;

export const setToolEnabledInputSchema = z.object({
  tool_name: z
    .string()
    .max(MAXIMUM_TOOL_NAME_LENGTH)
    .regex(/^[a-z][a-z0-9_]*$/),
  enabled: z.boolean(),
});

/**
 * Enables or disables an MCP tool for the actor. A row disables the tool (see
 * the `McpToolSetting` model). The catalog of the tools is in the MCP
 * package, thus the caller makes sure that the tool exists.
 *
 * @throws ForbiddenError when the actor cannot use the MCP server
 */
export const setToolEnabled = (
  context: ApplicationContext,
  actor: Actor,
  input: z.infer<typeof setToolEnabledInputSchema>,
): Promise<void> =>
  withSpan(context, "setToolEnabled", async () => {
    requireMcpAccess(actor);

    const { count } = input.enabled
      ? await context.prisma.mcpToolSetting.deleteMany({
          where: { userId: actor.userId, toolName: input.tool_name },
        })
      : await context.prisma.mcpToolSetting.createMany({
          data: [
            {
              userId: actor.userId,
              toolName: input.tool_name,
              disabledAt: context.now(),
            },
          ],
          skipDuplicates: true,
        });

    // The tool already had the requested state
    if (count === 0) return;

    await context.audit.create([
      {
        type: AuditEventType.MCP_TOOL_SETTING_UPDATED,
        data: { toolName: input.tool_name, enabled: input.enabled },
        createdById: actor.userId,
      },
    ]);
  });
