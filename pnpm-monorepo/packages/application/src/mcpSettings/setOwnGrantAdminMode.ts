import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { requireAdmin, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { NotFoundError } from "../errors.js";
import { requireMcpAccess } from "../mcpAccess.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { getOwnMcpGrantWhere } from "./ownMcpGrant.js";

export const setOwnGrantAdminModeInputSchema = z.object({
  grant_id: idSchema,
  enabled: z.boolean(),
});

export const setOwnGrantAdminMode = (
  context: ApplicationContext,
  actor: Actor,
  input: z.infer<typeof setOwnGrantAdminModeInputSchema>,
): Promise<void> =>
  withSpan(context, "setOwnGrantAdminMode", async () => {
    // The role and not the admin mode of the session: the admin mode of a
    // grant does not depend on the admin mode in the app
    requireAdmin(actor);
    requireMcpAccess(actor);

    const grant = await context.prisma.oAuthGrant.findFirst({
      where: { id: input.grant_id, ...getOwnMcpGrantWhere(context, actor) },
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
