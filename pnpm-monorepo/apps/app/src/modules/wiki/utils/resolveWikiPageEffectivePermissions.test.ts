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
import { resolveWikiPageEffectivePermissions } from "./resolveWikiPageEffectivePermissions";

const page = (
  overrides: Partial<WikiPagePermissionSource> & { id: string },
): WikiPagePermissionSource => ({
  parentId: null,
  ownerId: null,
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

const titles: Record<string, string> = {
  root: "Flotte",
  child: "Einsatzplanung",
};

const resolve = (
  pages: WikiPagePermissionSource[],
  roles: WikiPermissionRole[],
  pageId: string,
  options: Partial<
    Parameters<typeof resolveWikiPageEffectivePermissions>[3]
  > = {},
) =>
  resolveWikiPageEffectivePermissions(pages, roles, pageId, {
    ownerHandle: null,
    titleOf: (id) => titles[id],
    ...options,
  });

describe("resolve wiki page effective permissions", () => {
  test("lists roles that only reach read through a higher tier", () => {
    const pages = [
      page({
        id: "root",
        roleAccess: [
          { roleId: "reader", type: WikiPageAccessType.READ },
          { roleId: "editor", type: WikiPageAccessType.EDIT },
          { roleId: "manager", type: WikiPageAccessType.ADMIN },
        ],
      }),
    ];

    const result = resolve(
      pages,
      [role("reader"), role("editor"), role("manager")],
      "root",
    );

    expect(result.read).toEqual([
      { roleId: "reader", note: undefined },
      { roleId: "editor", note: "über Bearbeiten" },
      { roleId: "manager", note: "über Verwalten" },
    ]);
    expect(result.edit).toEqual([
      { roleId: "editor", note: undefined },
      { roleId: "manager", note: "über Verwalten" },
    ]);
  });

  test("the owner is the only individual and holds every tier", () => {
    const pages = [
      page({ id: "root", ownerId: "owner" }),
      page({ id: "child", parentId: "root" }),
    ];

    const result = resolve(pages, [], "child", {
      ownerHandle: "simon",
      ownerInheritedFrom: "Flotte",
    });

    const entry = { label: "Besitzer (@simon)", note: 'von "Flotte"' };
    expect(result.read).toEqual([entry]);
    expect(result.edit).toEqual([entry]);
    expect(result.inheritedAdmin).toEqual([entry]);
  });

  test("managers of ancestors are listed as always applying", () => {
    const pages = [
      page({
        id: "root",
        roleAccess: [{ roleId: "manager", type: WikiPageAccessType.ADMIN }],
      }),
      page({
        id: "child",
        parentId: "root",
        roleAccess: [{ roleId: "own-manager", type: WikiPageAccessType.ADMIN }],
      }),
    ];

    const result = resolve(
      pages,
      [
        role("manager"),
        role("own-manager"),
        role("wiki-admin", { hasWikiManage: true }),
      ],
      "child",
    );

    // The page's own manager role is configured below the list, not in it
    expect(result.inheritedAdmin).toEqual([
      { roleId: "manager", note: 'von "Flotte"' },
      { roleId: "wiki-admin", note: "Wiki-Management" },
    ]);
  });

  test("a tier open to everyone collapses into a single entry", () => {
    const pages = [
      page({
        id: "root",
        visibility: WikiPageVisibility.PUBLIC,
        editability: WikiPageEditability.ALL,
        roleAccess: [{ roleId: "reader", type: WikiPageAccessType.READ }],
      }),
    ];

    const result = resolve(pages, [role("reader")], "root", {
      ownerHandle: "simon",
    });

    expect(result.read).toEqual([{ label: "Alle mit Wiki-Zugriff" }]);
    expect(result.edit).toEqual([{ label: "Alle mit Wiki-Zugriff" }]);
  });

  test("inherited grants say which page they come from", () => {
    const pages = [
      page({
        id: "root",
        roleAccess: [{ roleId: "reader", type: WikiPageAccessType.READ }],
      }),
      page({
        id: "child",
        parentId: "root",
        visibility: WikiPageVisibility.INHERIT,
        editability: WikiPageEditability.INHERIT,
      }),
    ];

    const result = resolve(pages, [role("reader")], "child");

    expect(result.read).toEqual([
      { roleId: "reader", note: 'geerbt von "Flotte"' },
    ]);
  });

  test("roles kept out by the parent don't show up", () => {
    const pages = [
      page({
        id: "root",
        roleAccess: [{ roleId: "reader", type: WikiPageAccessType.READ }],
      }),
      page({
        id: "child",
        parentId: "root",
        roleAccess: [{ roleId: "outsider", type: WikiPageAccessType.READ }],
      }),
    ];

    const result = resolve(pages, [role("reader"), role("outsider")], "child");

    expect(result.read).toEqual([]);
  });
});
