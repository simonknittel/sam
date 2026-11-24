import { CursorDirection } from "@sam-monorepo/domain";
import * as z from "zod";
import { ValidationError } from "./errors.js";

export const DEFAULT_PAGE_LIMIT = 25;

export const MAXIMUM_PAGE_LIMIT = 100;

/**
 * A cursor is an id, a key or a merged cursor (a date, a source key and an
 * id, see `encodeCursor` of the domain package). These are much shorter.
 */
const MAXIMUM_CURSOR_LENGTH = 256;

export const pageLimitSchema = z
  .int()
  .min(1)
  .max(MAXIMUM_PAGE_LIMIT)
  .default(DEFAULT_PAGE_LIMIT)
  .describe("The maximum number of items in the result.");

export const cursorSchema = z
  .string()
  .min(1)
  .max(MAXIMUM_CURSOR_LENGTH)
  .describe("The next_cursor of the previous result.");

/**
 * The id of a row: `cuid()` (25 characters) or `cuid(2)` (at most 32
 * characters). Both have only lowercase letters and digits, thus one pattern
 * accepts both. Rows that a migration made with `gen_random_uuid()` have a
 * UUID, which this pattern refuses (see `flowIdSchema`).
 */
export const idSchema = z
  .string()
  .regex(/^[a-z0-9]{1,32}$/)
  .describe("An id from an earlier result.");

export enum UnknownCursorBehavior {
  /** A `ValidationError`: the MCP tools send only the cursors of a result */
  Reject = "reject",
  /**
   * The first page, or the last page for `CursorDirection.Prev`: the cursor
   * in the URL of an app page goes stale when its item disappears
   */
  FirstPage = "first_page",
}

export interface PageOptions {
  readonly direction?: CursorDirection;
  /**
   * Only the lists that page with `paginateByCursor()` or
   * `paginateByDatabaseCursor()` use it
   */
  readonly unknownCursor?: UnknownCursorBehavior;
}

interface CursorPageOptions<Item> extends PageOptions {
  readonly cursor?: string | null;
  readonly pageSize: number;
  readonly getCursor: (item: Item) => string;
}

export interface CursorPage<Item> {
  readonly items: Item[];
  readonly nextCursor: string | null;
  readonly previousCursor: string | null;
}

interface CursorPageTrimOptions<Item> {
  readonly cursor?: string | null;
  readonly direction: CursorDirection;
  readonly pageSize: number;
  readonly getCursor: (item: Item) => string;
}

/**
 * Makes the page from the rows of one page and one more row, which tells if
 * there are more rows in the direction. A cursor tells that there are rows
 * in the other direction.
 */
const toCursorPage = <Item>(
  rows: Item[],
  { cursor, direction, pageSize, getCursor }: CursorPageTrimOptions<Item>,
): CursorPage<Item> => {
  const hasMore = rows.length > pageSize;

  let items = rows;
  if (hasMore)
    items =
      direction === CursorDirection.Next
        ? rows.slice(0, pageSize)
        : rows.slice(1);

  const hasNextPage =
    direction === CursorDirection.Next ? hasMore : Boolean(cursor);
  const hasPreviousPage =
    direction === CursorDirection.Prev ? hasMore : Boolean(cursor);
  const firstItem = items.at(0);
  const lastItem = items.at(-1);

  return {
    items,
    nextCursor: hasNextPage && lastItem ? getCursor(lastItem) : null,
    previousCursor: hasPreviousPage && firstItem ? getCursor(firstItem) : null,
  };
};

export const paginateByCursor = <Item>(
  sortedItems: readonly Item[],
  {
    cursor,
    direction = CursorDirection.Next,
    unknownCursor = UnknownCursorBehavior.Reject,
    pageSize,
    getCursor,
  }: CursorPageOptions<Item>,
): CursorPage<Item> => {
  let pageItems: Item[];
  /** An unknown cursor tells nothing about the rows in the other direction */
  let knownCursor = cursor;

  if (cursor) {
    const cursorIndex = sortedItems.findIndex(
      (item) => getCursor(item) === cursor,
    );
    if (cursorIndex === -1) {
      if (unknownCursor === UnknownCursorBehavior.Reject)
        throw new ValidationError("Unknown cursor");

      knownCursor = null;
    }

    if (direction === CursorDirection.Next) {
      // An unknown cursor starts at the first item
      const fromIndex = cursorIndex + 1;
      pageItems = sortedItems.slice(fromIndex, fromIndex + pageSize + 1);
    } else {
      // An unknown cursor ends at the last item
      const toIndex = cursorIndex === -1 ? sortedItems.length : cursorIndex;
      pageItems = sortedItems.slice(
        Math.max(0, toIndex - pageSize - 1),
        toIndex,
      );
    }
  } else {
    pageItems = sortedItems.slice(0, pageSize + 1);
  }

  return toCursorPage(pageItems, {
    cursor: knownCursor,
    direction,
    pageSize,
    getCursor,
  });
};

export interface DatabaseCursorArguments {
  readonly cursor?: { readonly id: string };
  readonly skip?: number;
  readonly take: number;
}

interface DatabaseCursorPageOptions extends PageOptions {
  readonly cursor?: string | null;
  readonly pageSize: number;
}

/**
 * `findRows` spreads the arguments into its `findMany`; its order must be
 * total (end it with `id`). Prisma gives an empty page for a cursor that no
 * row has, thus an empty page with a cursor asks `isKnownCursor`.
 */
export const paginateByDatabaseCursor = async <
  Row extends { readonly id: string },
>(
  {
    cursor,
    pageSize,
    direction = CursorDirection.Next,
    unknownCursor = UnknownCursorBehavior.Reject,
  }: DatabaseCursorPageOptions,
  findRows: (cursorArguments: DatabaseCursorArguments) => Promise<Row[]>,
  isKnownCursor: (id: string) => Promise<boolean>,
): Promise<CursorPage<Row>> => {
  const take =
    direction === CursorDirection.Prev ? -(pageSize + 1) : pageSize + 1;

  const rows = await findRows(
    cursor ? { cursor: { id: cursor }, skip: 1, take } : { take },
  );

  if (cursor && rows.length === 0 && !(await isKnownCursor(cursor))) {
    if (unknownCursor === UnknownCursorBehavior.Reject)
      throw new ValidationError("Unknown cursor");

    return paginateByDatabaseCursor(
      { pageSize, direction, unknownCursor },
      findRows,
      isKnownCursor,
    );
  }

  return toCursorPage(rows, {
    cursor,
    direction,
    pageSize,
    getCursor: (row) => row.id,
  });
};
