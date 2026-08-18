import { describe, expect, test } from "vitest";
import { CursorDirection } from "./cursorPaginationParsers";
import {
  buildCursorConditions,
  compareMergedCursorEntries,
  decodeCursor,
  encodeCursor,
  isBeyondCursorPosition,
  paginateMergedSources,
  type MergedCursorEntry,
  type MergedCursorSource,
} from "./mergedCursor";

const entry = (sourceKey: string, id: string, date: string) => ({
  sourceKey,
  id,
  date: new Date(date),
});

/**
 * Stands in for a source backed by a table: the same filtering the `where`
 * conditions do in the database, done in memory over a fixed set of rows.
 */
const sourceOf = (
  rows: MergedCursorEntry[],
): MergedCursorSource<MergedCursorEntry> => {
  return ({ position, direction, take }) =>
    Promise.resolve(
      rows
        .filter((row) => isBeyondCursorPosition(row, position, direction))
        .toSorted((a, b) =>
          direction === CursorDirection.Next
            ? compareMergedCursorEntries(a, b)
            : compareMergedCursorEntries(b, a),
        )
        .slice(0, take),
    );
};

const keysOf = (entries: readonly MergedCursorEntry[]) =>
  entries.map((item) => `${item.sourceKey}/${item.id}`);

describe("merged cursor pagination", () => {
  test("interleaves the sources by date, newest first", async () => {
    const alpha = sourceOf([
      entry("alpha", "1", "2026-08-01T10:00:00Z"),
      entry("alpha", "2", "2026-08-03T10:00:00Z"),
    ]);
    const beta = sourceOf([
      entry("beta", "1", "2026-08-02T10:00:00Z"),
      entry("beta", "2", "2026-08-04T10:00:00Z"),
    ]);

    const page = await paginateMergedSources({
      sources: [alpha, beta],
      pageSize: 10,
    });

    expect(keysOf(page.entries)).toEqual([
      "beta/2",
      "alpha/2",
      "beta/1",
      "alpha/1",
    ]);
    expect(page.nextCursor).toBeNull();
    expect(page.prevCursor).toBeNull();
  });

  test("breaks ties between sources by source key, then by id descending", async () => {
    const sameInstant = "2026-08-01T10:00:00Z";
    const alpha = sourceOf([
      entry("alpha", "a", sameInstant),
      entry("alpha", "b", sameInstant),
    ]);
    const beta = sourceOf([entry("beta", "a", sameInstant)]);

    const page = await paginateMergedSources({
      sources: [beta, alpha],
      pageSize: 10,
    });

    expect(keysOf(page.entries)).toEqual(["alpha/b", "alpha/a", "beta/a"]);
  });

  test("walks forward through pages without skipping or repeating entries", async () => {
    const alpha = sourceOf(
      Array.from({ length: 7 }, (_, index) =>
        entry("alpha", `a${index}`, `2026-08-01T10:00:0${index}Z`),
      ),
    );
    const beta = sourceOf(
      Array.from({ length: 5 }, (_, index) =>
        entry("beta", `b${index}`, `2026-08-01T10:00:0${index}Z`),
      ),
    );

    const first = await paginateMergedSources({
      sources: [alpha, beta],
      pageSize: 5,
    });
    expect(keysOf(first.entries)).toEqual([
      "alpha/a6",
      "alpha/a5",
      "alpha/a4",
      "beta/b4",
      "alpha/a3",
    ]);
    expect(first.nextCursor).not.toBeNull();
    expect(first.prevCursor).toBeNull();

    const second = await paginateMergedSources({
      sources: [alpha, beta],
      pageSize: 5,
      cursor: first.nextCursor,
    });
    expect(keysOf(second.entries)).toEqual([
      "beta/b3",
      "alpha/a2",
      "beta/b2",
      "alpha/a1",
      "beta/b1",
    ]);

    const third = await paginateMergedSources({
      sources: [alpha, beta],
      pageSize: 5,
      cursor: second.nextCursor,
    });
    expect(keysOf(third.entries)).toEqual(["alpha/a0", "beta/b0"]);
    expect(third.nextCursor).toBeNull();
    expect(third.prevCursor).not.toBeNull();
  });

  test("walking back lands on the page that was left", async () => {
    const alpha = sourceOf(
      Array.from({ length: 7 }, (_, index) =>
        entry("alpha", `a${index}`, `2026-08-01T10:00:0${index}Z`),
      ),
    );
    const beta = sourceOf(
      Array.from({ length: 5 }, (_, index) =>
        entry("beta", `b${index}`, `2026-08-01T10:00:0${index}Z`),
      ),
    );

    const first = await paginateMergedSources({
      sources: [alpha, beta],
      pageSize: 5,
    });
    const second = await paginateMergedSources({
      sources: [alpha, beta],
      pageSize: 5,
      cursor: first.nextCursor,
    });
    const back = await paginateMergedSources({
      sources: [alpha, beta],
      pageSize: 5,
      cursor: second.prevCursor,
      direction: CursorDirection.Prev,
    });

    expect(keysOf(back.entries)).toEqual(keysOf(first.entries));
    expect(back.prevCursor).toBeNull();
    expect(back.nextCursor).not.toBeNull();
  });

  test("keeps paging when one source runs out before the others", async () => {
    const alpha = sourceOf(
      Array.from({ length: 6 }, (_, index) =>
        entry("alpha", `a${index}`, `2026-08-01T10:00:0${index}Z`),
      ),
    );
    const beta = sourceOf([entry("beta", "b0", "2026-08-01T10:00:09Z")]);

    const first = await paginateMergedSources({
      sources: [alpha, beta],
      pageSize: 3,
    });
    expect(keysOf(first.entries)).toEqual(["beta/b0", "alpha/a5", "alpha/a4"]);

    const second = await paginateMergedSources({
      sources: [alpha, beta],
      pageSize: 3,
      cursor: first.nextCursor,
    });
    expect(keysOf(second.entries)).toEqual([
      "alpha/a3",
      "alpha/a2",
      "alpha/a1",
    ]);

    const third = await paginateMergedSources({
      sources: [alpha, beta],
      pageSize: 3,
      cursor: second.nextCursor,
    });
    expect(keysOf(third.entries)).toEqual(["alpha/a0"]);
    expect(third.nextCursor).toBeNull();
  });

  test("reports no further page when the last one fills exactly", async () => {
    const alpha = sourceOf(
      Array.from({ length: 4 }, (_, index) =>
        entry("alpha", `a${index}`, `2026-08-01T10:00:0${index}Z`),
      ),
    );

    const first = await paginateMergedSources({
      sources: [alpha],
      pageSize: 2,
    });
    const second = await paginateMergedSources({
      sources: [alpha],
      pageSize: 2,
      cursor: first.nextCursor,
    });

    expect(keysOf(second.entries)).toEqual(["alpha/a1", "alpha/a0"]);
    expect(second.nextCursor).toBeNull();
  });

  test("returns an empty page instead of cursors when there is nothing to show", async () => {
    const page = await paginateMergedSources({
      sources: [sourceOf([])],
      pageSize: 5,
    });

    expect(page.entries).toEqual([]);
    expect(page.nextCursor).toBeNull();
    expect(page.prevCursor).toBeNull();
  });
});

describe("cursor encoding", () => {
  test("round-trips a position", () => {
    const position = {
      date: new Date("2026-08-01T10:00:00Z"),
      sourceKey: "alpha",
      id: "cuid-1",
    };

    expect(decodeCursor(encodeCursor(position))).toEqual(position);
  });

  test("keeps separators inside the id", () => {
    const position = {
      date: new Date("2026-08-01T10:00:00Z"),
      sourceKey: "alpha",
      id: "a|b",
    };

    expect(decodeCursor(encodeCursor(position))).toEqual(position);
  });

  test("falls back to the first page for anything malformed", () => {
    expect(decodeCursor(null)).toBeNull();
    expect(decodeCursor("")).toBeNull();
    expect(decodeCursor("nonsense")).toBeNull();
    expect(decodeCursor("nonsense|alpha|id")).toBeNull();
    expect(decodeCursor("2026-08-01T10:00:00.000Z|alpha")).toBeNull();
    expect(decodeCursor("2026-08-01T10:00:00.000Z||id")).toBeNull();
  });
});

describe("cursor query conditions", () => {
  const position = {
    date: new Date("2026-08-01T10:00:00Z"),
    sourceKey: "beta",
    id: "cuid-2",
  };

  test("has no conditions without a position", () => {
    expect(buildCursorConditions(null, "beta", CursorDirection.Next)).toEqual(
      [],
    );
  });

  test("compares by id within the source the position came from", () => {
    expect(
      buildCursorConditions(position, "beta", CursorDirection.Next),
    ).toEqual([
      {
        OR: [
          { createdAt: { lt: position.date } },
          { createdAt: position.date, id: { lt: "cuid-2" } },
        ],
      },
    ]);
  });

  test("includes the position's instant only for sources ordered after it", () => {
    expect(
      buildCursorConditions(position, "gamma", CursorDirection.Next),
    ).toEqual([{ createdAt: { lte: position.date } }]);

    expect(
      buildCursorConditions(position, "alpha", CursorDirection.Next),
    ).toEqual([{ createdAt: { lt: position.date } }]);
  });

  test("mirrors the comparison when walking backwards", () => {
    expect(
      buildCursorConditions(position, "alpha", CursorDirection.Prev),
    ).toEqual([{ createdAt: { gte: position.date } }]);

    expect(
      buildCursorConditions(position, "gamma", CursorDirection.Prev),
    ).toEqual([{ createdAt: { gt: position.date } }]);
  });
});
