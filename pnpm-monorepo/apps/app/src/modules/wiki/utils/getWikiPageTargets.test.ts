import { describe, expect, test } from "vitest";
import type {
  WikiSharedContext,
  WikiSharedContextPage,
} from "../queries/getWikiContext";
import {
  getManageableWikiPageTargets,
  getReadableWikiPageTargets,
} from "./getWikiPageTargets";

const page = (id: string, parentId: string | null) =>
  ({ id, parentId, title: id, sortOrder: 0 }) as WikiSharedContextPage;

const context = (
  pages: WikiSharedContextPage[],
  canAdmin: (pageId: string) => boolean = () => true,
): WikiSharedContext => ({
  pages,
  pagesById: new Map(pages.map((contextPage) => [contextPage.id, contextPage])),
  permissions: new Map(
    pages.map((contextPage) => [
      contextPage.id,
      {
        canRead: true,
        canEdit: true,
        canAdmin: canAdmin(contextPage.id),
      },
    ]),
  ),
});

const treeContext = () =>
  context([
    page("top", null),
    page("root", "top"),
    page("child", "root"),
    page("grandchild", "child"),
    page("outside", null),
  ]);

describe("getManageableWikiPageTargets", () => {
  test("reaches a subtree whose root has a parent", () => {
    const targets = getManageableWikiPageTargets(
      treeContext(),
      undefined,
      "root",
    );

    expect(targets).toEqual([
      { id: "root", title: "root", depth: 0 },
      { id: "child", title: "child", depth: 1 },
      { id: "grandchild", title: "grandchild", depth: 2 },
    ]);
  });

  test("excludes pages outside the subtree", () => {
    const targets = getManageableWikiPageTargets(
      treeContext(),
      undefined,
      "root",
    );

    expect(targets.map((target) => target.id)).not.toContain("top");
    expect(targets.map((target) => target.id)).not.toContain("outside");
  });

  test("combines the subtree with an excluded subtree", () => {
    const targets = getManageableWikiPageTargets(
      treeContext(),
      "child",
      "root",
    );

    expect(targets).toEqual([{ id: "root", title: "root", depth: 0 }]);
  });

  test("keeps depth relative to the nearest included ancestor", () => {
    const targets = getManageableWikiPageTargets(
      context(
        [
          page("root", null),
          page("child", "root"),
          page("grandchild", "child"),
        ],
        (pageId) => pageId !== "child",
      ),
      undefined,
      "root",
    );

    expect(targets).toEqual([
      { id: "root", title: "root", depth: 0 },
      { id: "grandchild", title: "grandchild", depth: 1 },
    ]);
  });

  test("walks the whole tree without a subtree", () => {
    const targets = getManageableWikiPageTargets(treeContext());

    expect(targets.map((target) => target.id)).toEqual([
      "outside",
      "top",
      "root",
      "child",
      "grandchild",
    ]);
  });
});

describe("getReadableWikiPageTargets", () => {
  test("limits readable targets to the subtree", () => {
    const targets = getReadableWikiPageTargets(treeContext(), "root");

    expect(targets.map((target) => target.id)).toEqual([
      "root",
      "child",
      "grandchild",
    ]);
  });
});
