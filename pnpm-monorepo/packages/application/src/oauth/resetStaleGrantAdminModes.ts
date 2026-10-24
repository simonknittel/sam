import { UserRole } from "@sam-monorepo/database/browser";
import type { Prisma } from "@sam-monorepo/database/client";
import { AuditEventType } from "@sam-monorepo/domain";
import type { ApplicationContext } from "../context.js";

/**
 * Turns off the admin mode of the grants of `where` whose user is not an
 * admin anymore, and gives the number of these grants. Admin mode applies
 * only to an admin, but a stale flag applies again after a later promotion,
 * without an action of the user. The admin role changes only in the
 * database, thus the MCP requests and the nightly purge clear the flag.
 */
export const resetStaleGrantAdminModes = async (
  context: ApplicationContext,
  where: Prisma.OAuthGrantWhereInput = {},
): Promise<number> => {
  // Only the request that turns the admin mode off writes the audit event
  const grants = await context.prisma.oAuthGrant.updateManyAndReturn({
    where: {
      AND: [
        where,
        {
          adminModeEnabledAt: { not: null },
          user: { OR: [{ role: null }, { role: { not: UserRole.ADMIN } }] },
        },
      ],
    },
    data: { adminModeEnabledAt: null, adminModeEnabledById: null },
    select: { id: true, clientId: true },
  });
  if (grants.length === 0) return 0;

  await context.audit.create(
    grants.map((grant) => ({
      type: AuditEventType.OAUTH_GRANT_ADMIN_MODE_UPDATED,
      data: { grantId: grant.id, clientId: grant.clientId, enabled: false },
      createdById: null,
    })),
  );

  return grants.length;
};
