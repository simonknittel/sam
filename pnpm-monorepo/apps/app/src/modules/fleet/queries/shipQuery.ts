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

export const SHIP_VARIANT_INCLUDE = {
  series: {
    include: {
      manufacturer: {
        include: {
          image: true,
        },
      },
    },
  },
  tags: true,
} as const satisfies Prisma.VariantInclude;

export const SHIP_INCLUDE = {
  variant: {
    include: SHIP_VARIANT_INCLUDE,
  },
} as const satisfies Prisma.ShipInclude;

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
