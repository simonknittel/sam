export enum SortDirection {
  Ascending = "asc",
  Descending = "desc",
}

interface Options {
  /** The direction the first click sorts by (default ascending) */
  readonly initialDirection?: SortDirection;
  /** The sort the table applies when the param is absent, e.g. "created-at-desc" */
  readonly treatMissingAs?: string;
}

/**
 * Builds the URLSearchParams a column-header sort link should point at:
 * clicking the column the list is already sorted by flips the direction,
 * clicking any other column sorts by it in its initial direction.
 */
export const toggleSortParam = (
  searchParams: URLSearchParams,
  sortKey: string,
  options?: Options,
) => {
  const initialDirection = options?.initialDirection ?? SortDirection.Ascending;
  const oppositeDirection =
    initialDirection === SortDirection.Ascending
      ? SortDirection.Descending
      : SortDirection.Ascending;

  const currentSort = searchParams.get("sort") ?? options?.treatMissingAs;

  const nextSearchParams = new URLSearchParams(searchParams);
  nextSearchParams.set(
    "sort",
    currentSort === `${sortKey}-${initialDirection}`
      ? `${sortKey}-${oppositeDirection}`
      : `${sortKey}-${initialDirection}`,
  );

  return nextSearchParams;
};
