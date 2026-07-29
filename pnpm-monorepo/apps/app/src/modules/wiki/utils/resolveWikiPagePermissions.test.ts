import {
  WikiPageAccessType,
  WikiPageAdminability,
  WikiPageEditability,
  WikiPageVisibility,
} from "@sam-monorepo/database/browser";
import { describe, expect, test } from "vitest";
import {
  resolveWikiPagePermissions,
  type WikiPagePermissionSource,
  type WikiPageViewer,
} from "./resolveWikiPagePermissions";

const page = (
  overrides: Partial<WikiPagePermissionSource> & { id: string },
): WikiPagePermissionSource => ({
  parentId: null,
  ownerId: null,
  visibility: WikiPageVisibility.INHERIT,
  editability: WikiPageEditability.INHERIT,
  adminability: WikiPageAdminability.INHERIT,
  roleAccess: [],
  ...overrides,
});

/** All tiers RESTRICTED with no roles, i.e. a "private" page (owner only) */
const restrictedToOwner = {
  visibility: WikiPageVisibility.RESTRICTED,
  editability: WikiPageEditability.RESTRICTED,
  adminability: WikiPageAdminability.RESTRICTED,
} as const;

const viewer = (overrides: Partial<WikiPageViewer> = {}): WikiPageViewer => ({
  citizenId: "viewer",
  roleIds: new Set(),
  hasWikiRead: true,
  hasWikiManage: false,
  ...overrides,
});

describe("resolve wiki page permissions", () => {
  test("no wiki;read denies everything, even public pages", () => {
    const pages = [
      page({ id: "1", visibility: WikiPageVisibility.PUBLIC }),
    ] as const;

    const result = resolveWikiPagePermissions(
      pages,
      viewer({ hasWikiRead: false }),
    );

    expect(result.get("1")).toMatchObject({
      canRead: false,
      canEdit: false,
      canAdmin: false,
    });
  });

  test("wiki;manage grants all tiers on foreign private pages", () => {
    const pages = [
      page({
        id: "1",
        ownerId: "someone-else",
        ...restrictedToOwner,
      }),
    ] as const;

    const result = resolveWikiPagePermissions(
      pages,
      viewer({ hasWikiManage: true }),
    );

    expect(result.get("1")).toMatchObject({
      canRead: true,
      canEdit: true,
      canAdmin: true,
    });
  });

  test("public pages are readable but not editable by plain readers", () => {
    const pages = [
      page({
        id: "1",
        ownerId: "someone-else",
        ...restrictedToOwner,
        visibility: WikiPageVisibility.PUBLIC,
      }),
    ] as const;

    const result = resolveWikiPagePermissions(pages, viewer());

    expect(result.get("1")).toMatchObject({
      canRead: true,
      canEdit: false,
      canAdmin: false,
    });
  });

  test("restricted visibility requires a matching role", () => {
    const pages = [
      page({
        id: "1",
        ownerId: "someone-else",
        ...restrictedToOwner,
        roleAccess: [{ roleId: "role-a", type: WikiPageAccessType.READ }],
      }),
    ] as const;

    const withRole = resolveWikiPagePermissions(
      pages,
      viewer({ roleIds: new Set(["role-a"]) }),
    );
    const withoutRole = resolveWikiPagePermissions(
      pages,
      viewer({ roleIds: new Set(["role-b"]) }),
    );

    expect(withRole.get("1")).toMatchObject({ canRead: true, canEdit: false });
    expect(withoutRole.get("1")).toMatchObject({ canRead: false });
  });

  test("restricted without roles behaves as private: only the owner", () => {
    const pages = [
      page({
        id: "1",
        ownerId: "owner",
        ...restrictedToOwner,
      }),
    ] as const;

    const asOwner = resolveWikiPagePermissions(
      pages,
      viewer({ citizenId: "owner" }),
    );
    const asStranger = resolveWikiPagePermissions(pages, viewer());

    expect(asOwner.get("1")).toMatchObject({
      canRead: true,
      canEdit: true,
      canAdmin: true,
    });
    expect(asStranger.get("1")).toMatchObject({
      canRead: false,
      canEdit: false,
      canAdmin: false,
    });
  });

  test("restricted implicitly includes the source page's owner on inheriting descendants", () => {
    const pages = [
      page({
        id: "root",
        ownerId: "owner-a",
        ...restrictedToOwner,
      }),
      page({ id: "child", parentId: "root", ownerId: "owner-b" }),
    ] as const;

    const asA = resolveWikiPagePermissions(
      pages,
      viewer({ citizenId: "owner-a" }),
    );
    const asStranger = resolveWikiPagePermissions(pages, viewer());

    expect(asA.get("child")).toMatchObject({
      canRead: true,
      canEdit: true,
      canAdmin: true,
    });
    expect(asStranger.get("child")).toMatchObject({ canRead: false });
  });

  test("ownership is inherited from the nearest ancestor with an explicit owner", () => {
    const pages = [
      page({
        id: "root",
        ownerId: "owner-a",
        ...restrictedToOwner,
      }),
      page({ id: "child", parentId: "root" }),
      page({ id: "grandchild", parentId: "child" }),
    ] as const;

    const asOwner = resolveWikiPagePermissions(
      pages,
      viewer({ citizenId: "owner-a" }),
    );
    const asStranger = resolveWikiPagePermissions(pages, viewer());

    expect(asOwner.get("grandchild")).toMatchObject({
      canRead: true,
      canEdit: true,
      canAdmin: true,
      ownerSourceId: "root",
      effectiveOwnerId: "owner-a",
    });
    expect(asStranger.get("grandchild")).toMatchObject({ canRead: false });
  });

  test("an explicit owner overrides inherited ownership", () => {
    const pages = [
      page({
        id: "root",
        ownerId: "owner-a",
        ...restrictedToOwner,
      }),
      page({ id: "child", parentId: "root", ownerId: "owner-b" }),
      page({ id: "grandchild", parentId: "child" }),
    ] as const;

    const asB = resolveWikiPagePermissions(
      pages,
      viewer({ citizenId: "owner-b" }),
    );

    // owner-b owns the child subtree, including inheriting descendants
    expect(asB.get("child")).toMatchObject({
      canRead: true,
      canEdit: true,
      canAdmin: true,
      effectiveOwnerId: "owner-b",
    });
    expect(asB.get("grandchild")).toMatchObject({
      canRead: true,
      effectiveOwnerId: "owner-b",
    });
    // ...but does not own the root
    expect(asB.get("root")).toMatchObject({ canRead: false });
  });

  test("a root without an owner is only accessible via wiki;manage", () => {
    const pages = [
      page({
        id: "root",
        ownerId: null,
        ...restrictedToOwner,
      }),
      page({ id: "child", parentId: "root" }),
    ] as const;

    const asStranger = resolveWikiPagePermissions(pages, viewer());
    const asManager = resolveWikiPagePermissions(
      pages,
      viewer({ hasWikiManage: true }),
    );

    expect(asStranger.get("root")).toMatchObject({
      canRead: false,
      effectiveOwnerId: null,
    });
    expect(asStranger.get("child")).toMatchObject({ canRead: false });
    expect(asManager.get("root")).toMatchObject({ canRead: true });
  });

  test("owners keep all tiers on their own page regardless of role lists", () => {
    const pages = [
      page({
        id: "1",
        ownerId: "owner",
        ...restrictedToOwner,
        roleAccess: [{ roleId: "role-a", type: WikiPageAccessType.READ }],
      }),
    ] as const;

    const result = resolveWikiPagePermissions(
      pages,
      viewer({ citizenId: "owner" }),
    );

    expect(result.get("1")).toMatchObject({
      canRead: true,
      canEdit: true,
      canAdmin: true,
    });
  });

  test("creators have no implicit access without ownership", () => {
    // The resolver deliberately doesn't know who created a page: ownership
    // starts with the creator but is transferable, so a former owner (e.g.
    // after leaving the org or switching departments) loses all implicit
    // access once ownership is reassigned.
    const pages = [
      page({
        id: "1",
        ownerId: "new-owner",
        ...restrictedToOwner,
      }),
    ] as const;

    const result = resolveWikiPagePermissions(
      pages,
      viewer({ citizenId: "original-creator" }),
    );

    expect(result.get("1")).toMatchObject({
      canRead: false,
      canEdit: false,
      canAdmin: false,
    });
  });

  test("INHERIT resolves against the nearest ancestor with an explicit setting", () => {
    const pages = [
      page({
        id: "root",
        ownerId: "someone-else",
        ...restrictedToOwner,
        roleAccess: [{ roleId: "role-a", type: WikiPageAccessType.READ }],
      }),
      page({ id: "child", parentId: "root", ownerId: "someone-else" }),
      page({
        id: "grandchild",
        parentId: "child",
        ownerId: "someone-else",
      }),
    ] as const;

    const withRole = resolveWikiPagePermissions(
      pages,
      viewer({ roleIds: new Set(["role-a"]) }),
    );
    const withoutRole = resolveWikiPagePermissions(pages, viewer());

    expect(withRole.get("grandchild")).toMatchObject({
      canRead: true,
      visibilitySourceId: "root",
    });
    expect(withoutRole.get("grandchild")).toMatchObject({ canRead: false });
    expect(withoutRole.get("child")).toMatchObject({ canRead: false });
  });

  test("nearest setting wins: a child can be more visible than its parent", () => {
    const pages = [
      page({
        id: "root",
        ownerId: "someone-else",
        ...restrictedToOwner,
        roleAccess: [{ roleId: "role-a", type: WikiPageAccessType.READ }],
      }),
      page({
        id: "child",
        parentId: "root",
        ownerId: "someone-else",
        visibility: WikiPageVisibility.PUBLIC,
      }),
    ] as const;

    const result = resolveWikiPagePermissions(pages, viewer());

    expect(result.get("root")).toMatchObject({ canRead: false });
    expect(result.get("child")).toMatchObject({
      canRead: true,
      visibilitySourceId: "child",
    });
  });

  test("edit implies read", () => {
    const pages = [
      page({
        id: "1",
        ownerId: "someone-else",
        ...restrictedToOwner,
        roleAccess: [{ roleId: "role-a", type: WikiPageAccessType.EDIT }],
      }),
    ] as const;

    const result = resolveWikiPagePermissions(
      pages,
      viewer({ roleIds: new Set(["role-a"]) }),
    );

    expect(result.get("1")).toMatchObject({
      canRead: true,
      canEdit: true,
      canAdmin: false,
    });
  });

  test("admin implies edit and read", () => {
    const pages = [
      page({
        id: "1",
        ownerId: "someone-else",
        ...restrictedToOwner,
        roleAccess: [{ roleId: "role-a", type: WikiPageAccessType.ADMIN }],
      }),
    ] as const;

    const result = resolveWikiPagePermissions(
      pages,
      viewer({ roleIds: new Set(["role-a"]) }),
    );

    expect(result.get("1")).toMatchObject({
      canRead: true,
      canEdit: true,
      canAdmin: true,
    });
  });

  test("editability ALL makes the page editable (and readable) for every reader", () => {
    const pages = [
      page({
        id: "1",
        ownerId: "someone-else",
        ...restrictedToOwner,
        editability: WikiPageEditability.ALL,
      }),
    ] as const;

    const result = resolveWikiPagePermissions(pages, viewer());

    expect(result.get("1")).toMatchObject({
      canRead: true,
      canEdit: true,
      canAdmin: false,
    });
  });

  test("access types don't leak across tiers", () => {
    const pages = [
      page({
        id: "1",
        ownerId: "someone-else",
        ...restrictedToOwner,
        roleAccess: [{ roleId: "role-a", type: WikiPageAccessType.READ }],
      }),
    ] as const;

    const result = resolveWikiPagePermissions(
      pages,
      viewer({ roleIds: new Set(["role-a"]) }),
    );

    expect(result.get("1")).toMatchObject({
      canRead: true,
      canEdit: false,
      canAdmin: false,
    });
  });

  test("a fully-INHERIT chain falls back to most restrictive", () => {
    const pages = [
      page({ id: "root", ownerId: "owner" }),
      page({ id: "child", parentId: "root", ownerId: "owner" }),
    ] as const;

    const asOwner = resolveWikiPagePermissions(
      pages,
      viewer({ citizenId: "owner" }),
    );
    const asStranger = resolveWikiPagePermissions(pages, viewer());

    expect(asOwner.get("child")).toMatchObject({ canRead: true });
    expect(asStranger.get("root")).toMatchObject({ canRead: false });
    expect(asStranger.get("child")).toMatchObject({ canRead: false });
  });

  test("parent cycles resolve without hanging and deny strangers", () => {
    const pages = [
      page({ id: "a", parentId: "b", ownerId: "someone-else" }),
      page({ id: "b", parentId: "a", ownerId: "someone-else" }),
    ] as const;

    const result = resolveWikiPagePermissions(pages, viewer());

    expect(result.get("a")).toMatchObject({ canRead: false });
    expect(result.get("b")).toMatchObject({ canRead: false });
  });

  test("viewers without a citizen never match owner-based grants", () => {
    const pages = [
      page({
        id: "1",
        ownerId: null,
        ...restrictedToOwner,
        visibility: WikiPageVisibility.PUBLIC,
      }),
    ] as const;

    const result = resolveWikiPagePermissions(
      pages,
      viewer({ citizenId: null }),
    );

    expect(result.get("1")).toMatchObject({
      canRead: true,
      canEdit: false,
      canAdmin: false,
    });
  });

  test("source ids point at the page supplying each effective setting", () => {
    const pages = [
      page({
        id: "root",
        ownerId: "someone-else",
        ...restrictedToOwner,
        visibility: WikiPageVisibility.PUBLIC,
      }),
      page({
        id: "child",
        parentId: "root",
        ownerId: "someone-else",
        editability: WikiPageEditability.ALL,
      }),
    ] as const;

    const result = resolveWikiPagePermissions(pages, viewer());

    expect(result.get("child")).toMatchObject({
      visibilitySourceId: "root",
      editabilitySourceId: "child",
      adminabilitySourceId: "root",
    });
  });
});
