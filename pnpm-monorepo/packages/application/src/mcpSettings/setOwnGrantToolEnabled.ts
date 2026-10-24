import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { NotFoundError } from "../errors.js";
import { requireMcpAccess } from "../mcpAccess.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { mcpToolNameSchema } from "./mcpToolNameSchema.js";

export const setOwnGrantToolEnabledInputSchema = z.object({
  grant_id: idSchema,
  tool_name: mcpToolNameSchema,
  enabled: z.boolean(),
});

/**
 * Enables or disables an MCP tool for a connected client of the actor. A row
 * disables the tool (see the `McpToolSetting` model). The caller makes sure
 * that the tool exists (see `mcpToolNameSchema`).
 *
 * @throws ForbiddenError when the actor cannot use the MCP server
 * @throws NotFoundError when the grant does not belong to the actor or is
 * revoked
 */
export const setOwnGrantToolEnabled = (
  context: ApplicationContext,
  actor: Actor,
  input: z.infer<typeof setOwnGrantToolEnabledInputSchema>,
): Promise<void> =>
  withSpan(context, "setOwnGrantToolEnabled", async () => {
    requireMcpAccess(actor);

    const grant = await context.prisma.oAuthGrant.findFirst({
      where: { id: input.grant_id, userId: actor.userId, revokedAt: null },
      select: { id: true, clientId: true },
    });
    if (!grant) throw new NotFoundError("The grant does not exist");

    const { count } = input.enabled
      ? await context.prisma.mcpToolSetting.deleteMany({
          where: { grantId: grant.id, toolName: input.tool_name },
        })
      : await context.prisma.mcpToolSetting.createMany({
          data: [
            {
              grantId: grant.id,
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
        type: AuditEventType.MCP_TOOL_SETTING_UPDATED_V2,
        data: {
          grantId: grant.id,
          clientId: grant.clientId,
          toolName: input.tool_name,
          enabled: input.enabled,
        },
        createdById: actor.userId,
      },
    ]);
  });
