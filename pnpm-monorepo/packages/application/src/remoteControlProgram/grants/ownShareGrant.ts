import type { Prisma } from "@sam-monorepo/database/client";
import {
  CapabilityId,
  GranteeKind,
  GrantOperation,
} from "@sam-monorepo/domain";
import {
  CITIZEN_REFERENCE_SELECT,
  toCitizenReference,
  type CitizenReference,
} from "../../citizenReference.js";

/**
 * The active grants of one owner. The sharing popover shows all of them in
 * one list without pages, and each delivery of new entries of the owner
 * loads the valid grants of the owner (`loadReadAccessToOwner()`), thus the
 * limit keeps the list and this query small. An owner usually shares with
 * some citizens, some roles and everyone. 50 is far above this, and stops a
 * defect or a script from making an unlimited number of active grants.
 */
export const MAXIMUM_ACTIVE_SHARE_GRANTS_PER_OWNER = 50;

export interface ShareGrantRole {
  readonly id: string;
  readonly name: string;
}

/** Who a grant gives access to, for the display */
export type ShareGrantGrantee =
  | {
      readonly kind: typeof GranteeKind.citizen;
      /** Null when the citizen was deleted: the grant gives no access */
      readonly citizen: CitizenReference | null;
    }
  | { readonly kind: typeof GranteeKind.role; readonly role: ShareGrantRole }
  | { readonly kind: typeof GranteeKind.everyone };

/** A grant of the owner, for the section "Shared with others" */
export interface OwnShareGrant {
  readonly id: string;
  readonly grantee: ShareGrantGrantee;
  readonly capabilityIds: CapabilityId[];
  readonly operations: GrantOperation[];
  /** Can be in the past (decision 8) and in the future */
  readonly startsAt: Date;
  /** Null: no end. The caller shows the remaining time until this time. */
  readonly endsAt: Date | null;
  readonly createdAt: Date;
}

export const OWN_SHARE_GRANT_SELECT = {
  id: true,
  granteeKind: true,
  granteeCitizen: { select: CITIZEN_REFERENCE_SELECT },
  granteeRole: { select: { id: true, name: true } },
  capabilityIds: true,
  operations: true,
  startsAt: true,
  endsAt: true,
  createdAt: true,
} as const satisfies Prisma.ShareGrantSelect;

type OwnShareGrantRow = Prisma.ShareGrantGetPayload<{
  select: typeof OWN_SHARE_GRANT_SELECT;
}>;

/**
 * The grants of the owner that are not revoked and did not end. This
 * includes the grants that start in the future.
 */
export const createActiveOwnShareGrantWhere = (
  ownerCitizenId: string,
  now: Date,
): Prisma.ShareGrantWhereInput => ({
  ownerId: ownerCitizenId,
  revokedAt: null,
  OR: [{ endsAt: null }, { endsAt: { gt: now } }],
});

/** The CHECK constraint of the table makes sure that the grantee column of the kind is set */
const toShareGrantGrantee = (row: OwnShareGrantRow): ShareGrantGrantee => {
  const kind = row.granteeKind;

  switch (kind) {
    case GranteeKind.citizen:
      return { kind, citizen: toCitizenReference(row.granteeCitizen) };

    case GranteeKind.role:
      if (!row.granteeRole)
        throw new Error(`The grant ${row.id} to a role has no role`);

      return {
        kind,
        role: { id: row.granteeRole.id, name: row.granteeRole.name },
      };

    case GranteeKind.everyone:
      return { kind };

    default:
      throw new Error(`Unknown grantee kind: ${kind satisfies never}`);
  }
};

/** An unknown value of the database gives no access, thus the display leaves it out */
const keepKnownValues = <Value extends string>(
  knownValues: readonly Value[],
  values: readonly string[],
): Value[] =>
  values.filter((value): value is Value =>
    (knownValues as readonly string[]).includes(value),
  );

export const toOwnShareGrant = (row: OwnShareGrantRow): OwnShareGrant => ({
  id: row.id,
  grantee: toShareGrantGrantee(row),
  capabilityIds: keepKnownValues(
    Object.values(CapabilityId),
    row.capabilityIds,
  ),
  operations: keepKnownValues(Object.values(GrantOperation), row.operations),
  startsAt: row.startsAt,
  endsAt: row.endsAt,
  createdAt: row.createdAt,
});
