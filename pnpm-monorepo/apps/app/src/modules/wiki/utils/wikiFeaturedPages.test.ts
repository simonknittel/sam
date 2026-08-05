import { describe, expect, test } from "vitest";
import { resolveWikiFeaturedPages } from "./wikiFeaturedPages";

const page = (id: string, deletedAt: Date | null = null) => ({ id, deletedAt });

const pagesById = (...pages: ReturnType<typeof page>[]) =>
  new Map(pages.map((entry) => [entry.id, entry]));

describe("resolveWikiFeaturedPages", () => {
  test("keeps the stored order instead of the page order", () => {
    const pages = pagesById(page("a"), page("b"), page("c"));

    const result = resolveWikiFeaturedPages(["c", "a"], pages, () => true);

    expect(result).toEqual([page("c"), page("a")]);
  });

  test("skips unknown, deleted and duplicated ids", () => {
    const deletedAt = new Date("2026-08-05T00:00:00Z");
    const pages = pagesById(page("a"), page("trashed", deletedAt));

    const result = resolveWikiFeaturedPages(
      ["a", "gone", "trashed", "a"],
      pages,
      () => true,
    );

    expect(result).toEqual([page("a")]);
  });

  test("skips pages the viewer cannot read", () => {
    const pages = pagesById(page("a"), page("secret"));

    const result = resolveWikiFeaturedPages(
      ["a", "secret"],
      pages,
      (pageId) => pageId !== "secret",
    );

    expect(result).toEqual([page("a")]);
  });
});
