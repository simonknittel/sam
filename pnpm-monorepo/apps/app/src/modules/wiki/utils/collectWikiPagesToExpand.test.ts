import { describe, expect, test } from "vitest";
import type { WikiTreeNode } from "./buildVisibleWikiTree";
import { collectWikiPagesToExpand } from "./collectWikiPagesToExpand";

const node = (id: string, children: WikiTreeNode[] = []): WikiTreeNode => ({
  id,
  title: id,
  slug: id,
  iconId: null,
  sortOrder: 0,
  canEdit: false,
  canAdmin: false,
  children,
});

const tree = [
  node("ships", [
    node("anvil", [node("carrack")]),
    node("aegis", [node("sabre"), node("gladius")]),
  ]),
  node("rules"),
];

describe("collectWikiPagesToExpand", () => {
  test("returns the ancestors of a childless page", () => {
    expect(collectWikiPagesToExpand(tree, "gladius")).toEqual([
      "ships",
      "aegis",
    ]);
  });

  test("also returns the page itself when it has children", () => {
    expect(collectWikiPagesToExpand(tree, "anvil")).toEqual(["ships", "anvil"]);
  });

  test("returns a root page with children on its own", () => {
    expect(collectWikiPagesToExpand(tree, "ships")).toEqual(["ships"]);
  });

  test("returns nothing for a childless root page", () => {
    expect(collectWikiPagesToExpand(tree, "rules")).toEqual([]);
  });

  test("returns nothing for a page outside the tree", () => {
    expect(collectWikiPagesToExpand(tree, "unknown")).toEqual([]);
    expect(collectWikiPagesToExpand(tree, undefined)).toEqual([]);
  });
});
