import { VariantStatus, type Prisma } from "@sam-monorepo/database/client";

export const FLEET_PAGE_SIZE = 100;

interface VariantFilterOptions {
  readonly flightReady?: "all" | "flight_ready";
  readonly variantTagIds?: string[];
  readonly manufacturerIds?: string[];
  readonly searchQuery?: string | null;
}

/**
 * The variant filter shared by the fleet list queries, driven by the
 * fleet filter UI.
 */
export const buildVariantFilterWhere = ({
  flightReady = "all",
  variantTagIds = [],
  manufacturerIds = [],
  searchQuery,
}: VariantFilterOptions): Record<string, unknown> => ({
  ...(flightReady === "flight_ready"
    ? { status: VariantStatus.FLIGHT_READY }
    : {}),
  ...(variantTagIds.length > 0
    ? { tags: { some: { id: { in: variantTagIds } } } }
    : {}),
  ...(manufacturerIds.length > 0
    ? { series: { manufacturerId: { in: manufacturerIds } } }
    : {}),
  ...(searchQuery
    ? { name: { contains: searchQuery, mode: "insensitive" } }
    : {}),
});

/**
 * A variant as the fleet tables render it: the name and status, the
 * manufacturer's logo (a `VariantWithLogo`, i.e. {id, mimeType}) and the
 * tag badges. The fleet queries scan every ship or variant and paginate in
 * memory, so each unused column here is multiplied by the whole table.
 */
export const SHIP_VARIANT_SELECT = {
  id: true,
  name: true,
  status: true,
  series: {
    select: {
      manufacturer: {
        select: {
          name: true,
          image: { select: { id: true, mimeType: true } },
        },
      },
    },
  },
  tags: { select: { id: true, key: true, value: true } },
} as const satisfies Prisma.VariantSelect;

export type ShipVariant = Prisma.VariantGetPayload<{
  select: typeof SHIP_VARIANT_SELECT;
}>;

export const SHIP_SELECT = {
  id: true,
  name: true,
  variantId: true,
  deletedAt: true,
  variant: {
    select: SHIP_VARIANT_SELECT,
  },
} as const satisfies Prisma.ShipSelect;

interface CursorPageOptions<Item> {
  readonly cursor?: string | null;
  readonly direction?: "next" | "prev";
  readonly pageSize: number;
  readonly getCursor: (item: Item) => string;
}

/**
 * The in-memory cursor pagination shared by the fleet list queries: slices
 * one page (+1 lookahead item) out of the already sorted list and derives
 * the next/previous cursors.
 */
export const paginateByCursor = <Item>(
  sortedItems: Item[],
  { cursor, direction = "next", pageSize, getCursor }: CursorPageOptions<Item>,
) => {
  let pageItems: Item[];

  if (!cursor) {
    pageItems = sortedItems.slice(0, pageSize + 1);
  } else if (direction === "next") {
    const cursorIndex = sortedItems.findIndex(
      (item) => getCursor(item) === cursor,
    );
    const fromIndex = cursorIndex !== -1 ? cursorIndex + 1 : 0;
    pageItems = sortedItems.slice(fromIndex, fromIndex + pageSize + 1);
  } else {
    const cursorIndex = sortedItems.findIndex(
      (item) => getCursor(item) === cursor,
    );
    const toIndex = cursorIndex !== -1 ? cursorIndex : sortedItems.length;
    const fromIndex = Math.max(0, toIndex - pageSize - 1);
    pageItems = sortedItems.slice(fromIndex, toIndex);
  }

  const hasMore = pageItems.length > pageSize;

  const items = hasMore
    ? direction === "next"
      ? pageItems.slice(0, pageSize)
      : pageItems.slice(1)
    : pageItems;

  const hasNextPage = direction === "next" ? hasMore : Boolean(cursor);
  const hasPrevPage = direction === "prev" ? hasMore : Boolean(cursor);

  return {
    items,
    nextCursor:
      hasNextPage && items.length > 0
        ? getCursor(items[items.length - 1])
        : null,
    prevCursor: hasPrevPage && items.length > 0 ? getCursor(items[0]) : null,
  };
};

export type FleetShip = Prisma.ShipGetPayload<{
  select: typeof SHIP_SELECT;
}>;
