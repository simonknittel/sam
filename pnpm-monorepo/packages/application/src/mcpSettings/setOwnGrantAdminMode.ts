import { UserRole } from "@sam-monorepo/database/browser";
import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ForbiddenError, NotFoundError } from "../errors.js";
import { requireMcpAccess } from "../mcpAccess.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";

export const setOwnGrantAdminModeInputSchema = z.object({
  grant_id: idSchema,
  enabled: z.boolean(),
});

/**
 * Enables or disables admin mode for a connected client of the actor. Admin
 * mode gives the requests of the client all permissions, like admin mode in
 * the app. It applies only while the user is an admin.
 *
 * @throws ForbiddenError when the actor is not an admin or cannot use the
 * MCP server
 * @throws NotFoundError when the grant does not belong to the actor or is
 * revoked
 */
export const setOwnGrantAdminMode = (
  context: ApplicationContext,
  actor: Actor,
  input: z.infer<typeof setOwnGrantAdminModeInputSchema>,
): Promise<void> =>
  withSpan(context, "setOwnGrantAdminMode", async () => {
    // The role and not the admin mode of the session: the admin mode of a
    // grant does not depend on the admin mode in the app
    if (actor.userRole !== UserRole.ADMIN)
      throw new ForbiddenError(
        "Only an admin can change the admin mode of a client",
      );
    requireMcpAccess(actor);

    const grant = await context.prisma.oAuthGrant.findFirst({
      where: { id: input.grant_id, userId: actor.userId, revokedAt: null },
      select: { id: true, clientId: true, adminModeEnabledAt: true },
    });
    if (!grant) throw new NotFoundError("The grant does not exist");

    if ((grant.adminModeEnabledAt !== null) === input.enabled) return;

    const { count } = await context.prisma.oAuthGrant.updateMany({
      // The condition makes only one of two parallel requests write the
      // audit event
      where: {
        id: grant.id,
        revokedAt: null,
        adminModeEnabledAt: input.enabled ? null : { not: null },
      },
      data: input.enabled
        ? {
            adminModeEnabledAt: context.now(),
            adminModeEnabledById: actor.userId,
          }
        : { adminModeEnabledAt: null, adminModeEnabledById: null },
    });
    if (count === 0) return;

    await context.audit.create([
      {
        type: AuditEventType.OAUTH_GRANT_ADMIN_MODE_UPDATED,
        data: {
          grantId: grant.id,
          clientId: grant.clientId,
          enabled: input.enabled,
        },
        createdById: actor.userId,
      },
    ]);
  });
