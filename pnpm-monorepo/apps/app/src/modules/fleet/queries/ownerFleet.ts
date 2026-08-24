import { prisma } from "@/db";
import {
  sortAscWithAndNullLast,
  sortDescAndNullLast,
} from "@/modules/common/utils/sorting";
import type { Entity } from "@sam-monorepo/database/client";
import {
  buildVariantFilterWhere,
  FLEET_PAGE_SIZE,
  paginateByCursor,
  SHIP_SELECT,
} from "./shipQuery";

interface OwnerFleetOptions {
  readonly flightReady?: "all" | "flight_ready";
  readonly variantTagIds?: string[];
  readonly manufacturerIds?: string[];
  readonly sort?: "name-asc" | "name-desc";
  readonly showDeleted?: "all" | "deleted";
  readonly searchQuery?: string | null;
  readonly cursor?: string | null;
  readonly direction?: "next" | "prev";
}

/**
 * The ship list of one citizen. "My ships" and the fleet page of a citizen
 * show the same list with the same filters, sort and pagination — only the
 * permission that guards them differs, thus the callers keep the
 * authorization and share everything else.
 */
export const getOwnerFleet = async (
  ownerId: Entity["id"],
  {
    flightReady = "all",
    variantTagIds = [],
    manufacturerIds = [],
    sort = "name-asc",
    showDeleted = "all",
    searchQuery,
    cursor,
    direction = "next",
  }: OwnerFleetOptions = {},
) => {
  const shipWhere: Record<string, unknown> = {
    ownerId,
    ...(showDeleted === "all"
      ? { deletedAt: null }
      : { deletedAt: { not: null } }),
    variant: buildVariantFilterWhere({
      flightReady,
      variantTagIds,
      manufacturerIds,
      searchQuery,
    }),
  };

  const allShips = await prisma.ship.findMany({
    where: shipWhere,
    select: SHIP_SELECT,
  });

  const [, sortDirection] = sort.split("-") as [string, "asc" | "desc"];
  const sortedShips = allShips.toSorted((a, b) =>
    sortDirection === "asc"
      ? sortAscWithAndNullLast(a.variant.name, b.variant.name)
      : sortDescAndNullLast(a.variant.name, b.variant.name),
  );

  const {
    items: ships,
    nextCursor,
    prevCursor,
  } = paginateByCursor(sortedShips, {
    cursor,
    direction,
    pageSize: FLEET_PAGE_SIZE,
    getCursor: (ship) => ship.id,
  });

  return {
    ships,
    total: allShips.length,
    nextCursor,
    prevCursor,
  };
};

/** The tags of every variant that the citizen owns a ship of. */
export const getOwnerFleetVariantTags = (ownerId: Entity["id"]) =>
  prisma.variantTag.findMany({
    where: {
      variants: {
        some: {
          ships: {
            some: {
              ownerId,
              deletedAt: null,
            },
          },
        },
      },
    },
    orderBy: [{ key: "asc" }, { value: "asc" }],
    select: { id: true, key: true, value: true },
  });
