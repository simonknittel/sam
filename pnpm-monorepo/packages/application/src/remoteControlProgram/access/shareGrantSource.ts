import type { Prisma } from "@sam-monorepo/database/client";
import {
  ACTIVE_CITIZEN_WHERE,
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
  granteeRoleId: true,
  capabilityIds: true,
  operations: true,
  startsAt: true,
  endsAt: true,
  revokedAt: true,
} as const satisfies Record<keyof ShareGrantSource, true> &
  Prisma.ShareGrantSelect;

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
});
