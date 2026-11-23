import { ShareGrantGranteeKind } from "@sam-monorepo/database/browser";
import type { Prisma } from "@sam-monorepo/database/client";
import {
  ACTIVE_CITIZEN_WHERE,
  GrantOperation,
  GranteeKind,
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
} as const satisfies Prisma.ShareGrantSelect;

type ShareGrantSourceRow = Prisma.ShareGrantGetPayload<{
  select: typeof SHARE_GRANT_SOURCE_SELECT;
}>;

export const toGranteeKind = (kind: ShareGrantGranteeKind): GranteeKind => {
  switch (kind) {
    case ShareGrantGranteeKind.citizen:
      return GranteeKind.Citizen;

    case ShareGrantGranteeKind.role:
      return GranteeKind.Role;

    case ShareGrantGranteeKind.everyone:
      return GranteeKind.Everyone;

    default:
      throw new Error(`Unknown grantee kind: ${kind satisfies never}`);
  }
};

export const toShareGrantSource = (
  row: ShareGrantSourceRow,
): ShareGrantSource => ({
  id: row.id,
  ownerCitizenId: row.ownerId,
  granteeKind: toGranteeKind(row.granteeKind),
  granteeCitizenId: row.granteeCitizenId,
  granteeRoleId: row.granteeRoleId,
  capabilityIds: row.capabilityIds,
  operations: row.operations,
  startsAt: row.startsAt,
  endsAt: row.endsAt,
  revokedAt: row.revokedAt,
});

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
