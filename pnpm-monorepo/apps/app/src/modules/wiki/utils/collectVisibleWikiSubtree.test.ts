import { describe, expect, test } from "vitest";
import { collectVisibleWikiSubtree } from "./collectVisibleWikiSubtree";

const page = (id: string, parentId: string | null) => ({ id, parentId });

describe("collectVisibleWikiSubtree", () => {
  test("returns readable descendants in parent-before-child order", () => {
    const pages = [
      page("root", null),
      page("a", "root"),
      page("a1", "a"),
      page("b", "root"),
      page("other", null),
    ];

    const result = collectVisibleWikiSubtree(pages, "root", () => true);

    expect(result).toEqual([
      { page: page("a", "root"), visibleParentId: "root" },
      { page: page("a1", "a"), visibleParentId: "a" },
      { page: page("b", "root"), visibleParentId: "root" },
    ]);
  });

  test("excludes unreadable pages", () => {
    const pages = [page("root", null), page("a", "root"), page("b", "root")];

    const result = collectVisibleWikiSubtree(pages, "root", (id) => id !== "b");

    expect(result).toEqual([
      { page: page("a", "root"), visibleParentId: "root" },
    ]);
  });

  test("hoists readable descendants of unreadable pages to the nearest readable ancestor", () => {
    const pages = [
      page("root", null),
      page("a", "root"),
      page("hidden", "a"),
      page("hidden-child", "hidden"),
      page("hidden-hidden", "hidden"),
    ];

    const result = collectVisibleWikiSubtree(
      pages,
      "root",
      (id) => !id.startsWith("hidden") || id === "hidden-child",
    );

    expect(result).toEqual([
      { page: page("a", "root"), visibleParentId: "root" },
      { page: page("hidden-child", "hidden"), visibleParentId: "a" },
    ]);
  });

  test("does not include pages outside the subtree", () => {
    const pages = [
      page("root", null),
      page("a", "root"),
      page("outside", null),
      page("outside-child", "outside"),
    ];

    const result = collectVisibleWikiSubtree(pages, "root", () => true);

    expect(result).toEqual([
      { page: page("a", "root"), visibleParentId: "root" },
    ]);
  });

  test("is cycle-safe", () => {
    const pages = [page("a", "b"), page("b", "a"), page("c", "a")];

    const result = collectVisibleWikiSubtree(pages, "a", () => true);

    expect(result).toEqual([
      { page: page("b", "a"), visibleParentId: "a" },
      { page: page("c", "a"), visibleParentId: "a" },
    ]);
  });
});
