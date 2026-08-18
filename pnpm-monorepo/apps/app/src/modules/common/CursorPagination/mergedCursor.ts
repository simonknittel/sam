import { CursorDirection } from "./cursorPaginationParsers";

/**
 * The position a page boundary sits at. `sourceKey` is part of it because a
 * merged page is drawn from several tables whose rows can share a timestamp
 * down to the millisecond — without a tie-breaker that is total across all
 * of them, rows tied with the boundary row get skipped or repeated.
 */
export interface CursorPosition {
  readonly date: Date;
  readonly sourceKey: string;
  readonly id: string;
}

/** The part of an entry the merging needs to order it. */
export interface MergedCursorEntry {
  readonly sourceKey: string;
  readonly id: string;
  readonly date: Date;
}

/**
 * Fetches up to `take` entries of one source, starting right after
 * `position` in the direction being walked. Sources are expected to push the
 * position into their query (see `buildCursorConditions`) rather than to
 * filter afterwards.
 */
export interface MergedCursorSourceInput {
  readonly position: CursorPosition | null;
  readonly direction: CursorDirection;
  readonly take: number;
}

export type MergedCursorSource<Entry extends MergedCursorEntry> = (
  input: MergedCursorSourceInput,
) => Promise<readonly Entry[]>;

const CURSOR_SEPARATOR = "|";

export const encodeCursor = (entry: MergedCursorEntry) =>
  [entry.date.toISOString(), entry.sourceKey, entry.id].join(CURSOR_SEPARATOR);

/**
 * Cursors come from the URL, so anything malformed resolves to "no position"
 * — the first page — instead of throwing.
 */
export const decodeCursor = (cursor?: string | null): CursorPosition | null => {
  if (!cursor) return null;

  const firstSeparator = cursor.indexOf(CURSOR_SEPARATOR);
  if (firstSeparator < 0) return null;

  const secondSeparator = cursor.indexOf(CURSOR_SEPARATOR, firstSeparator + 1);
  if (secondSeparator < 0) return null;

  const date = new Date(cursor.slice(0, firstSeparator));
  if (Number.isNaN(date.getTime())) return null;

  const sourceKey = cursor.slice(firstSeparator + 1, secondSeparator);
  const id = cursor.slice(secondSeparator + 1);
  if (!sourceKey || !id) return null;

  return { date, sourceKey, id };
};

/**
 * The total order every merged page is cut out of: newest first, then by
 * source, then by id descending. The `where` clauses built below encode
 * exactly this comparison, so the two must stay in sync.
 */
export const compareMergedCursorEntries = (
  a: MergedCursorEntry,
  b: MergedCursorEntry,
) => {
  if (a.date.getTime() !== b.date.getTime())
    return b.date.getTime() - a.date.getTime();

  if (a.sourceKey !== b.sourceKey) return a.sourceKey < b.sourceKey ? -1 : 1;

  if (a.id === b.id) return 0;
  return a.id < b.id ? 1 : -1;
};

/** Whether the entry sits beyond the position in the direction being walked. */
export const isBeyondCursorPosition = (
  entry: MergedCursorEntry,
  position: CursorPosition | null,
  direction: CursorDirection,
) => {
  if (!position) return true;

  const comparison =
    direction === CursorDirection.Next
      ? compareMergedCursorEntries(position, entry)
      : compareMergedCursorEntries(entry, position);

  return comparison < 0;
};

interface DateFieldCondition {
  lt?: Date;
  lte?: Date;
  gt?: Date;
  gte?: Date;
}

/**
 * Deliberately mutable and structural so it drops straight into a Prisma
 * `where`'s `AND` without a cast.
 */
export interface CursorCondition {
  createdAt?: Date | DateFieldCondition;
  id?: { lt?: string; gt?: string };
  OR?: CursorCondition[];
}

/**
 * The `where` conditions selecting the rows of one source that sit beyond
 * `position`. Returned as an array so callers can drop it into their own
 * `AND` without colliding with the other filters' conditions.
 *
 * When the position was produced by a different source, whether this
 * source's rows with the very same timestamp sit before or after it is
 * decided by the source keys alone — that is what makes them comparable
 * without reading the other source's rows.
 */
export const buildCursorConditions = (
  position: CursorPosition | null,
  sourceKey: string,
  direction: CursorDirection,
): CursorCondition[] => {
  if (!position) return [];

  const isNext = direction === CursorDirection.Next;

  if (position.sourceKey === sourceKey) {
    return [
      {
        OR: [
          { createdAt: isNext ? { lt: position.date } : { gt: position.date } },
          {
            createdAt: position.date,
            id: isNext ? { lt: position.id } : { gt: position.id },
          },
        ],
      },
    ];
  }

  const includesPositionDate = isNext
    ? sourceKey > position.sourceKey
    : sourceKey < position.sourceKey;

  if (includesPositionDate)
    return [
      {
        createdAt: isNext ? { lte: position.date } : { gte: position.date },
      },
    ];

  return [
    { createdAt: isNext ? { lt: position.date } : { gt: position.date } },
  ];
};

/** The `orderBy` a source has to use for the merging to line up. */
export const cursorOrderBy = (direction: CursorDirection) =>
  direction === CursorDirection.Next
    ? [{ createdAt: "desc" as const }, { id: "desc" as const }]
    : [{ createdAt: "asc" as const }, { id: "asc" as const }];

interface PaginateMergedSourcesInput<Entry extends MergedCursorEntry> {
  readonly sources: readonly MergedCursorSource<Entry>[];
  readonly pageSize: number;
  readonly cursor?: string | null;
  readonly direction?: CursorDirection;
}

/**
 * Cuts one page out of several independently queried sources. Each source is
 * asked for one entry more than the page holds, which is what tells a page
 * that ends exactly on a source boundary apart from one that has run out.
 */
export const paginateMergedSources = async <Entry extends MergedCursorEntry>({
  sources,
  pageSize,
  cursor,
  direction = CursorDirection.Next,
}: PaginateMergedSourcesInput<Entry>) => {
  const position = decodeCursor(cursor);
  const take = pageSize + 1;

  const results = await Promise.all(
    sources.map((source) => source({ position, direction, take })),
  );

  const merged = results.flat().toSorted(compareMergedCursorEntries);

  /**
   * Walking backwards, the sources returned the entries *above* the cursor,
   * of which the ones closest to it are the last in descending order.
   */
  const window =
    direction === CursorDirection.Next
      ? merged.slice(0, take)
      : merged.slice(-take);

  const hasMore = window.length > pageSize;

  let entries: Entry[];
  if (!hasMore) {
    entries = window;
  } else {
    entries =
      direction === CursorDirection.Next
        ? window.slice(0, pageSize)
        : window.slice(1);
  }

  const hasNextPage =
    direction === CursorDirection.Next ? hasMore : Boolean(position);
  const hasPrevPage =
    direction === CursorDirection.Prev ? hasMore : Boolean(position);

  return {
    entries,
    nextCursor:
      hasNextPage && entries.length > 0
        ? encodeCursor(entries[entries.length - 1])
        : null,
    prevCursor:
      hasPrevPage && entries.length > 0 ? encodeCursor(entries[0]) : null,
  };
};
