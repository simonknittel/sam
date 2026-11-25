import type { Prisma } from "@sam-monorepo/database/client";
import {
  ACTIVE_CITIZEN_WHERE,
  GranteeKind,
  GrantOperation,
  type CapabilityId,
  type ShareGrantSource,
} from "@sam-monorepo/domain";

/** The columns of a grant that the rule of the access reads */
export const SHARE_GRANT_SOURCE_SELECT = {
  id: true,
  ownerId: true,
  granteeKind: true,
  granteeCitizenId: true,
  granteeRoles: { select: { roleId: true } },
  capabilityIds: true,
  operations: true,
  startsAt: true,
  endsAt: true,
  revokedAt: true,
} as const satisfies Record<keyof ShareGrantSource, unknown> &
  Prisma.ShareGrantSelect;

/**
 * Leaves out the grants whose roles were all deleted. They give no access,
 * and the owner does not see them.
 */
export const GRANT_WITH_GRANTEE_WHERE = {
  NOT: { granteeKind: GranteeKind.role, granteeRoles: { none: {} } },
} as const satisfies Prisma.ShareGrantWhereInput;

/**
 * The grants of owners that are not deleted, which give `read` on the
 * capability and are valid at the time. The filter only makes the query
 * small: `getEffectiveReadAccess()` of the domain applies the full rule
 * again.
 */
export const createReadableGrantWhere = (
  capabilityId: CapabilityId,
  now: Date,
): Prisma.ShareGrantWhereInput => ({
  owner: ACTIVE_CITIZEN_WHERE,
  capabilityIds: { has: capabilityId },
  operations: { has: GrantOperation.Read },
  revokedAt: null,
  startsAt: { lte: now },
  OR: [{ endsAt: null }, { endsAt: { gt: now } }],
  ...GRANT_WITH_GRANTEE_WHERE,
});
