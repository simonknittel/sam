import {
  WikiPageAccessType,
  WikiPageEditability,
  WikiPageUploadability,
  WikiPageVisibility,
} from "@sam-monorepo/database/browser";
import type {
  WikiPagePermissionSource,
  WikiPermissionRole,
} from "@sam-monorepo/permissions";
import { describe, expect, test } from "vitest";
import { collectWikiPageRolePrunes } from "./collectWikiPageRolePrunes";

const page = (
  overrides: Partial<WikiPagePermissionSource> & { id: string },
): WikiPagePermissionSource => ({
  parentId: null,
  ownerId: "owner",
  visibility: WikiPageVisibility.RESTRICTED,
  editability: WikiPageEditability.RESTRICTED,
  imageUploadability: WikiPageUploadability.RESTRICTED,
  attachmentUploadability: WikiPageUploadability.RESTRICTED,
  roleAccess: [],
  ...overrides,
});

const role = (
  id: string,
  overrides: Partial<WikiPermissionRole> = {},
): WikiPermissionRole => ({
  id,
  effectiveRoleIds: [id],
  hasWikiManage: false,
  ...overrides,
});

const read = (roleId: string) => ({
  roleId,
  type: WikiPageAccessType.READ,
});

describe("collect wiki page role prunes", () => {
  test("drops read roles the parent locks out and keeps the rest", () => {
    const pages = [
      page({ id: "root", roleAccess: [read("a")] }),
      page({
        id: "child",
        parentId: "root",
        roleAccess: [read("a"), read("b")],
      }),
    ];

    const prunes = collectWikiPageRolePrunes(
      pages,
      [role("a"), role("b")],
      ["child"],
    );

    expect(prunes).toEqual([{ pageId: "child", roleIds: ["b"] }]);
  });

  test("a single pass reaches dead entries further down the chain", () => {
    const pages = [
      page({ id: "root", roleAccess: [read("a")] }),
      page({ id: "child", parentId: "root", roleAccess: [read("b")] }),
      page({ id: "grandchild", parentId: "child", roleAccess: [read("b")] }),
    ];

    const prunes = collectWikiPageRolePrunes(
      pages,
      [role("a"), role("b")],
      ["child", "grandchild"],
    );

    expect(prunes).toEqual([
      { pageId: "child", roleIds: ["b"] },
      { pageId: "grandchild", roleIds: ["b"] },
    ]);
  });

  test("inherited roles count as access to the parent", () => {
    const pages = [
      page({ id: "root", roleAccess: [read("a")] }),
      page({ id: "child", parentId: "root", roleAccess: [read("b")] }),
    ];

    const prunes = collectWikiPageRolePrunes(
      pages,
      [role("a"), role("b", { effectiveRoleIds: ["b", "a"] })],
      ["child"],
    );

    expect(prunes).toEqual([]);
  });

  test("roles reaching the parent by other means are kept", () => {
    const pages = [
      page({
        id: "root",
        roleAccess: [
          { roleId: "editor", type: WikiPageAccessType.EDIT },
          { roleId: "manager", type: WikiPageAccessType.ADMIN },
        ],
      }),
      page({
        id: "child",
        parentId: "root",
        roleAccess: [read("editor"), read("manager"), read("wiki-admin")],
      }),
    ];

    const prunes = collectWikiPageRolePrunes(
      pages,
      [
        role("editor"),
        role("manager"),
        role("wiki-admin", { hasWikiManage: true }),
      ],
      ["child"],
    );

    expect(prunes).toEqual([]);
  });

  test("top-level pages are never pruned", () => {
    const pages = [page({ id: "root", roleAccess: [read("a")] })];

    const prunes = collectWikiPageRolePrunes(pages, [role("a")], ["root"]);

    expect(prunes).toEqual([]);
  });

  test("a page inheriting its visibility keeps its unused read roles", () => {
    // The role list is inactive while the page inherits, but it is not dead:
    // switching the page back to RESTRICTED must not silently lose it.
    const pages = [
      page({ id: "root", roleAccess: [read("a")] }),
      page({
        id: "child",
        parentId: "root",
        visibility: WikiPageVisibility.INHERIT,
        roleAccess: [read("a")],
      }),
    ];

    const prunes = collectWikiPageRolePrunes(pages, [role("a")], ["child"]);

    expect(prunes).toEqual([]);
  });

  test("edit and manage entries are pruned by the same rule", () => {
    const pages = [
      page({ id: "root", roleAccess: [read("a")] }),
      page({
        id: "child",
        parentId: "root",
        roleAccess: [
          { roleId: "b", type: WikiPageAccessType.EDIT },
          { roleId: "c", type: WikiPageAccessType.ADMIN },
          read("a"),
        ],
      }),
    ];

    const prunes = collectWikiPageRolePrunes(
      pages,
      [role("a"), role("b"), role("c")],
      ["child"],
    );

    expect(prunes).toEqual([{ pageId: "child", roleIds: ["b", "c"] }]);
  });

  test("a page whose parent is missing is left alone", () => {
    // The resolver treats a broken chain like a top-level page, so pruning
    // must not read it as "the parent grants nothing" and wipe the lists.
    const pages = [
      page({ id: "orphan", parentId: "gone", roleAccess: [read("a")] }),
    ];

    const prunes = collectWikiPageRolePrunes(pages, [role("a")], ["orphan"]);

    expect(prunes).toEqual([]);
  });
});
