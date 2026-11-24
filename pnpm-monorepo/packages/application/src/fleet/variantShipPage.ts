import type { ShipAcquisitionSource } from "@sam-monorepo/database/client";
import { ORG_ID } from "@sam-monorepo/domain";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { listActiveOrganizationMemberships } from "../organizations/organizationMemberships.js";
import { paginateByCursor, type PageOptions } from "../pagination.js";
import { withSpan } from "../withSpan.js";

/**
 * The same as the page size of the fleet tables of the app (`FLEET_PAGE_SIZE`)
 */
const VARIANT_SHIPS_PAGE_SIZE = 100;

export interface VariantShipRow {
  readonly id: string;
  readonly ownerId: string;
  readonly name: string | null;
  readonly acquisitionSource: ShipAcquisitionSource | null;
  readonly note: string | null;
  readonly owner: {
    readonly handle: string | null;
    readonly deletedAt: Date | null;
  };
}

export interface VariantShipPage {
  readonly ships: VariantShipRow[];
  readonly total: number;
  readonly nextCursor: string | null;
  readonly prevCursor: string | null;
  /** Null when the variant does not exist */
  readonly variantName: string | null;
}

export const findVariantShipPage = (
  context: Pick<ApplicationContext, "prisma" | "tracer">,
  actor: Actor,
  {
    variantId,
    cursor,
  }: {
    readonly variantId: string;
    readonly cursor?: string | null;
  },
  { direction, unknownCursor }: PageOptions = {},
): Promise<VariantShipPage> =>
  withSpan(context, "findVariantShipPage", async () => {
    requirePermission(actor, "otherShips", "read");

    /**
     * The list shows only the ships of the members, thus the permission of
     * the member list also gates it. It runs before the variant lookup, thus
     * an unknown variant cannot skip the check.
     */
    const citizenIds = (
      await listActiveOrganizationMemberships(context, actor, ORG_ID)
    ).map((membership) => membership.citizen.id);

    const variant = await context.prisma.variant.findUnique({
      where: { id: variantId },
      select: { name: true },
    });
    if (!variant)
      return {
        ships: [],
        total: 0,
        nextCursor: null,
        prevCursor: null,
        variantName: null,
      };

    const ships = await context.prisma.ship.findMany({
      where: { ownerId: { in: citizenIds }, variantId, deletedAt: null },
      select: {
        id: true,
        ownerId: true,
        name: true,
        acquisitionSource: true,
        note: true,
        owner: { select: { handle: true, deletedAt: true } },
      },
    });

    const sortedShips = ships.toSorted((first, second) =>
      (first.owner.handle || first.ownerId).localeCompare(
        second.owner.handle || second.ownerId,
      ),
    );

    const page = paginateByCursor(sortedShips, {
      cursor,
      direction,
      unknownCursor,
      pageSize: VARIANT_SHIPS_PAGE_SIZE,
      getCursor: (ship) => ship.id,
    });

    return {
      ships: page.items,
      total: sortedShips.length,
      nextCursor: page.nextCursor,
      prevCursor: page.previousCursor,
      variantName: variant.name,
    };
  });
