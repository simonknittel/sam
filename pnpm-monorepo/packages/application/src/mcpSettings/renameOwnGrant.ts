import {
  AuditEventType,
  OAUTH_GRANT_CUSTOM_NAME_MAXIMUM_LENGTH,
} from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { NotFoundError } from "../errors.js";
import { requireMcpAccess } from "../mcpAccess.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";

/** An empty name removes the own name: the list then shows the client name */
export const grantCustomNameSchema = z
  .string()
  .trim()
  .max(OAUTH_GRANT_CUSTOM_NAME_MAXIMUM_LENGTH)
  .transform((customName) => customName || null);

export const renameOwnGrantInputSchema = z.object({
  grant_id: idSchema,
  custom_name: grantCustomNameSchema,
});

/**
 * Gives a connected client of the actor an own name, for example to tell two
 * grants of the same client apart.
 *
 * @throws ForbiddenError when the actor cannot use the MCP server
 * @throws NotFoundError when the grant does not belong to the actor or is
 * revoked
 */
export const renameOwnGrant = (
  context: ApplicationContext,
  actor: Actor,
  input: z.infer<typeof renameOwnGrantInputSchema>,
): Promise<void> =>
  withSpan(context, "renameOwnGrant", async () => {
    requireMcpAccess(actor);

    const grant = await context.prisma.oAuthGrant.findFirst({
      where: { id: input.grant_id, userId: actor.userId, revokedAt: null },
      select: { id: true, clientId: true, customName: true },
    });
    if (!grant) throw new NotFoundError("The grant does not exist");

    if (grant.customName === input.custom_name) return;

    const { count } = await context.prisma.oAuthGrant.updateMany({
      // The condition makes only one of two parallel requests write the
      // audit event
      where: { id: grant.id, revokedAt: null, customName: grant.customName },
      data: { customName: input.custom_name },
    });
    if (count === 0) return;

    await context.audit.create([
      {
        type: AuditEventType.OAUTH_GRANT_RENAMED,
        data: {
          grantId: grant.id,
          clientId: grant.clientId,
          customName: input.custom_name,
        },
        createdById: actor.userId,
      },
    ]);
  });
