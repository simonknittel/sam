import { WikiPageSidebarMode } from "@sam-monorepo/database/client";
import { describe, expect, test } from "vitest";
import { filterWikiPagesBySidebarMode } from "./filterWikiPagesBySidebarMode";

interface TestPage {
  readonly id: string;
  readonly parentId: string | null;
  readonly sidebarMode: WikiPageSidebarMode;
}

const page = (
  id: string,
  parentId: string | null,
  sidebarMode: WikiPageSidebarMode = WikiPageSidebarMode.VISIBLE,
): TestPage => ({ id, parentId, sidebarMode });

const ids = (pages: readonly TestPage[]) => pages.map((entry) => entry.id);

describe("filterWikiPagesBySidebarMode", () => {
  test("keeps all pages when every page is VISIBLE", () => {
    const pages = [page("a", null), page("b", "a"), page("c", "b")];

    expect(ids(filterWikiPagesBySidebarMode(pages))).toEqual(["a", "b", "c"]);
  });

  test("HIDDEN removes the page and its whole subtree", () => {
    const pages = [
      page("a", null),
      page("b", "a", WikiPageSidebarMode.HIDDEN),
      page("c", "b"),
      page("d", "c"),
      page("e", "a"),
    ];

    expect(ids(filterWikiPagesBySidebarMode(pages))).toEqual(["a", "e"]);
  });

  test("CHILDREN_HIDDEN keeps the page but removes its whole subtree", () => {
    const pages = [
      page("a", null, WikiPageSidebarMode.CHILDREN_HIDDEN),
      page("b", "a"),
      page("c", "b"),
      page("d", null),
    ];

    expect(ids(filterWikiPagesBySidebarMode(pages))).toEqual(["a", "d"]);
  });

  test("hiding wins even when intermediate pages are VISIBLE", () => {
    const pages = [
      page("a", null, WikiPageSidebarMode.HIDDEN),
      page("b", "a"),
      page("c", "b"),
    ];

    expect(ids(filterWikiPagesBySidebarMode(pages))).toEqual([]);
  });

  test("a HIDDEN descendant inside a visible subtree only removes its own subtree", () => {
    const pages = [
      page("a", null),
      page("b", "a"),
      page("c", "b", WikiPageSidebarMode.HIDDEN),
      page("d", "c"),
      page("e", "b"),
    ];

    expect(ids(filterWikiPagesBySidebarMode(pages))).toEqual(["a", "b", "e"]);
  });

  test("top-level HIDDEN pages are removed", () => {
    const pages = [
      page("a", null, WikiPageSidebarMode.HIDDEN),
      page("b", null),
    ];

    expect(ids(filterWikiPagesBySidebarMode(pages))).toEqual(["b"]);
  });

  test("pages with a missing parent are treated like top-level pages", () => {
    const pages = [page("a", "missing"), page("b", null)];

    expect(ids(filterWikiPagesBySidebarMode(pages))).toEqual(["a", "b"]);
  });

  test("broken parent cycles keep their pages visible", () => {
    const pages = [page("a", "b"), page("b", "a"), page("c", null)];

    expect(ids(filterWikiPagesBySidebarMode(pages))).toEqual(["a", "b", "c"]);
  });
});
