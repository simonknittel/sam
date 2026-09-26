import { WikiPageSidebarMode } from "@sam-monorepo/database/client";
import { describe, expect, test } from "vitest";
import { buildVisibleWikiTree } from "./buildVisibleWikiTree";
import { filterWikiPagesBySidebarMode } from "./filterWikiPagesBySidebarMode";
import { pruneWikiTree } from "./pruneWikiTree";

interface TestPage {
  readonly id: string;
  readonly parentId: string | null;
  readonly title: string;
  readonly slug: string;
  readonly iconId: string | null;
  readonly sortOrder: number;
  readonly sidebarMode: WikiPageSidebarMode;
}

const page = (
  id: string,
  parentId: string | null,
  sidebarMode: WikiPageSidebarMode = WikiPageSidebarMode.VISIBLE,
): TestPage => ({
  id,
  parentId,
  title: id,
  slug: id,
  iconId: null,
  sortOrder: 0,
  sidebarMode,
});

const permissionsFor = (
  pages: readonly TestPage[],
  unreadableIds: readonly string[] = [],
) =>
  new Map(
    pages.map((entry) => [
      entry.id,
      {
        canRead: !unreadableIds.includes(entry.id),
        canEdit: false,
        canAdmin: false,
      },
    ]),
  );

/**
 * The sidebar's default view as the server built it before: the tree of
 * the pages that the sidebar mode keeps — and as the client derives it now.
 */
const expectSameDefaultTree = (
  pages: readonly TestPage[],
  unreadableIds: readonly string[] = [],
) => {
  const permissions = permissionsFor(pages, unreadableIds);
  const keptIds = new Set(
    filterWikiPagesBySidebarMode(pages).map((entry) => entry.id),
  );
  const hiddenIds = new Set(
    pages
      .filter(
        (entry) => !keptIds.has(entry.id) && permissions.get(entry.id)?.canRead,
      )
      .map((entry) => entry.id),
  );

  expect(
    pruneWikiTree(buildVisibleWikiTree(pages, permissions), hiddenIds),
  ).toEqual(
    buildVisibleWikiTree(filterWikiPagesBySidebarMode(pages), permissions),
  );
};

describe("pruneWikiTree", () => {
  test("removes the pages and their subtrees", () => {
    const pages = [page("a", null), page("b", "a"), page("c", "b")];
    const tree = buildVisibleWikiTree(pages, permissionsFor(pages));

    expect(pruneWikiTree(tree, new Set(["b"]))).toEqual([
      expect.objectContaining({ id: "a", children: [] }),
    ]);
  });

  test("matches the tree of the sidebar-mode-filtered pages", () => {
    expectSameDefaultTree([
      page("a", null),
      page("b", "a", WikiPageSidebarMode.HIDDEN),
      page("c", "b"),
      page("d", "a", WikiPageSidebarMode.CHILDREN_HIDDEN),
      page("e", "d"),
      page("f", "e"),
      page("g", null),
      page("h", "deleted-parent"),
      page("i", "h", WikiPageSidebarMode.HIDDEN),
    ]);
  });

  test("matches the filtered tree when hidden pages have unreadable parts", () => {
    expectSameDefaultTree(
      [
        page("a", null),
        page("b", "a", WikiPageSidebarMode.HIDDEN),
        page("c", "b"),
        page("d", "a"),
        page("e", "d", WikiPageSidebarMode.HIDDEN),
      ],
      ["b", "e"],
    );
  });
});
