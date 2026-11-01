import { CursorDirection } from "@sam-monorepo/domain";
import { describe, expect, test, vi } from "vitest";
import { ValidationError } from "./errors.js";
import {
  paginateByCursor,
  paginateByDatabaseCursor,
  UnknownCursorBehavior,
  type DatabaseCursorArguments,
} from "./pagination.js";

const ROWS = ["1", "2", "3", "4", "5"].map((id) => ({ id }));

const PAGE_SIZE = 2;

/** Reads the rows as Prisma does with `cursor`, `skip` and `take` */
const createFindRows = () =>
  vi.fn(({ cursor, skip = 0, take }: DatabaseCursorArguments) => {
    if (!cursor)
      return Promise.resolve(take > 0 ? ROWS.slice(0, take) : ROWS.slice(take));

    const cursorIndex = ROWS.findIndex((row) => row.id === cursor.id);
    if (cursorIndex === -1) return Promise.resolve([]);

    if (take > 0)
      return Promise.resolve(
        ROWS.slice(cursorIndex + skip, cursorIndex + skip + take),
      );

    const endIndex = cursorIndex + 1 - skip;
    return Promise.resolve(ROWS.slice(Math.max(0, endIndex + take), endIndex));
  });

const isKnownCursor = (id: string) =>
  Promise.resolve(ROWS.some((row) => row.id === id));

describe("paginateByDatabaseCursor", () => {
  test("trims the page and gives the cursors in both directions", async () => {
    const findRows = createFindRows();

    await expect(
      paginateByDatabaseCursor(
        { cursor: "2", pageSize: PAGE_SIZE },
        findRows,
        isKnownCursor,
      ),
    ).resolves.toEqual({
      items: [{ id: "3" }, { id: "4" }],
      nextCursor: "4",
      previousCursor: "3",
    });

    await expect(
      paginateByDatabaseCursor(
        { cursor: "4", pageSize: PAGE_SIZE, direction: CursorDirection.Prev },
        findRows,
        isKnownCursor,
      ),
    ).resolves.toEqual({
      items: [{ id: "2" }, { id: "3" }],
      nextCursor: "3",
      previousCursor: "2",
    });
  });

  test("keeps an empty page after a known cursor", async () => {
    const findRows = createFindRows();

    await expect(
      paginateByDatabaseCursor(
        { cursor: "5", pageSize: PAGE_SIZE },
        findRows,
        isKnownCursor,
      ),
    ).resolves.toEqual({ items: [], nextCursor: null, previousCursor: null });
    expect(findRows).toHaveBeenCalledTimes(1);
  });

  test("rejects an unknown cursor by default", async () => {
    await expect(
      paginateByDatabaseCursor(
        { cursor: "unknown", pageSize: PAGE_SIZE },
        createFindRows(),
        isKnownCursor,
      ),
    ).rejects.toThrow(ValidationError);
  });

  test("drops an unknown cursor and reads the first page, or the last page backward", async () => {
    const findRows = createFindRows();

    await expect(
      paginateByDatabaseCursor(
        {
          cursor: "unknown",
          pageSize: PAGE_SIZE,
          unknownCursor: UnknownCursorBehavior.FirstPage,
        },
        findRows,
        isKnownCursor,
      ),
    ).resolves.toEqual({
      items: [{ id: "1" }, { id: "2" }],
      nextCursor: "2",
      previousCursor: null,
    });
    expect(findRows).toHaveBeenLastCalledWith({ take: PAGE_SIZE + 1 });

    await expect(
      paginateByDatabaseCursor(
        {
          cursor: "unknown",
          pageSize: PAGE_SIZE,
          direction: CursorDirection.Prev,
          unknownCursor: UnknownCursorBehavior.FirstPage,
        },
        findRows,
        isKnownCursor,
      ),
    ).resolves.toEqual({
      items: [{ id: "4" }, { id: "5" }],
      nextCursor: null,
      previousCursor: "4",
    });
  });
});

describe("paginateByCursor", () => {
  test("drops an unknown cursor and gives the first page, or the last page backward", () => {
    const options = {
      cursor: "unknown",
      pageSize: PAGE_SIZE,
      unknownCursor: UnknownCursorBehavior.FirstPage,
      getCursor: (row: { readonly id: string }) => row.id,
    };

    expect(paginateByCursor(ROWS, options)).toEqual({
      items: [{ id: "1" }, { id: "2" }],
      nextCursor: "2",
      previousCursor: null,
    });

    expect(
      paginateByCursor(ROWS, { ...options, direction: CursorDirection.Prev }),
    ).toEqual({
      items: [{ id: "4" }, { id: "5" }],
      nextCursor: null,
      previousCursor: "4",
    });
  });
});
