import { AuditEventType } from "@sam-monorepo/domain";
import type { ApplicationContext } from "../context.js";

interface RevokeGrantInput {
  readonly grantId: string;
  readonly clientId: string;
  /** Null for a revocation by the app */
  readonly revokedById: string | null;
  /** Null for the app */
  readonly auditCreatedById: string | null;
}

/**
 * The access tokens of the grant stop at the next request, because each
 * request with an access token loads the grant (`resolvePrincipal()`). The
 * relay service also checks the grant of a desktop companion at each token
 * renewal. Only the call that revokes the grant writes the audit event.
 *
 * @returns Whether this call revoked the grant
 */
export const revokeGrant = async (
  context: ApplicationContext,
  { grantId, clientId, revokedById, auditCreatedById }: RevokeGrantInput,
) => {
  const { count } = await context.prisma.$transaction(async (transaction) => {
    const result = await transaction.oAuthGrant.updateMany({
      where: { id: grantId, revokedAt: null },
      data: { revokedAt: context.now(), revokedById },
    });

    await transaction.oAuthRefreshToken.deleteMany({ where: { grantId } });

    return result;
  });
  if (count === 0) return false;

  await context.audit.create([
    {
      type: AuditEventType.OAUTH_GRANT_REVOKED,
      data: { grantId, clientId },
      createdById: auditCreatedById,
    },
  ]);

  return true;
};
