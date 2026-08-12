import {
  WikiPageAccessType,
  WikiPageEditability,
  WikiPageUploadability,
  WikiPageVisibility,
} from "@sam-monorepo/database/browser";
import { describe, expect, test } from "vitest";
import {
  resolveWikiPagePermissions,
  type WikiPagePermissionSource,
  type WikiPageViewer,
} from "./index.js";

const page = (
  overrides: Partial<WikiPagePermissionSource> & { id: string },
): WikiPagePermissionSource => ({
  parentId: null,
  ownerId: null,
  visibility: WikiPageVisibility.INHERIT,
  editability: WikiPageEditability.INHERIT,
  imageUploadability: WikiPageUploadability.INHERIT,
  attachmentUploadability: WikiPageUploadability.INHERIT,
  roleAccess: [],
  ...overrides,
});

/** All tiers RESTRICTED with no roles, i.e. a "private" page (owner only) */
const restrictedToOwner = {
  visibility: WikiPageVisibility.RESTRICTED,
  editability: WikiPageEditability.RESTRICTED,
} as const;

const viewer = (overrides: Partial<WikiPageViewer> = {}): WikiPageViewer => ({
  citizenId: "viewer",
  roleIds: new Set(),
  hasWikiManage: false,
  ...overrides,
});

describe("resolve wiki page permissions", () => {
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
        // owner-b reaches the root through this role, so the parent gate
        // lets their ownership of the child subtree take effect
        roleAccess: [{ roleId: "role-b", type: WikiPageAccessType.READ }],
      }),
      page({ id: "child", parentId: "root", ownerId: "owner-b" }),
      page({ id: "grandchild", parentId: "child" }),
    ] as const;

    const asB = resolveWikiPagePermissions(
      pages,
      viewer({ citizenId: "owner-b", roleIds: new Set(["role-b"]) }),
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
    // ...but only reads the root, they don't own it
    expect(asB.get("root")).toMatchObject({
      canRead: true,
      canAdmin: false,
    });
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

  test("a child page cannot widen read access", () => {
    // PUBLIC is rejected on child pages by the update action; leftover data
    // must not turn a restricted subtree public either.
    const pages = [
      page({
        id: "root",
        ownerId: "someone-else",
        ...restrictedToOwner,
        roleAccess: [{ roleId: "role-a", type: WikiPageAccessType.READ }],
      }),
      page({
        id: "public-child",
        parentId: "root",
        ownerId: "someone-else",
        visibility: WikiPageVisibility.PUBLIC,
      }),
      page({
        id: "restricted-child",
        parentId: "root",
        ownerId: "someone-else",
        visibility: WikiPageVisibility.RESTRICTED,
        roleAccess: [{ roleId: "role-b", type: WikiPageAccessType.READ }],
      }),
    ] as const;

    const asStranger = resolveWikiPagePermissions(pages, viewer());
    const withParentRole = resolveWikiPagePermissions(
      pages,
      viewer({ roleIds: new Set(["role-a"]) }),
    );
    const withChildRole = resolveWikiPagePermissions(
      pages,
      viewer({ roleIds: new Set(["role-b"]) }),
    );
    const withBothRoles = resolveWikiPagePermissions(
      pages,
      viewer({ roleIds: new Set(["role-a", "role-b"]) }),
    );

    expect(asStranger.get("public-child")).toMatchObject({ canRead: false });
    expect(withParentRole.get("public-child")).toMatchObject({ canRead: true });
    // The child narrows the parent's audience down to role-b...
    expect(withParentRole.get("restricted-child")).toMatchObject({
      canRead: false,
    });
    // ...but cannot hand access to a role the parent locks out
    expect(withChildRole.get("restricted-child")).toMatchObject({
      canRead: false,
    });
    expect(withBothRoles.get("restricted-child")).toMatchObject({
      canRead: true,
    });
  });

  test("managers of a page keep all tiers on its whole subtree", () => {
    const pages = [
      page({
        id: "root",
        ownerId: "owner-a",
        ...restrictedToOwner,
        roleAccess: [{ roleId: "role-admin", type: WikiPageAccessType.ADMIN }],
      }),
      page({
        id: "child",
        parentId: "root",
        // An own owner and an own manager role must not cut the root off
        ownerId: "owner-b",
        ...restrictedToOwner,
        roleAccess: [
          { roleId: "role-other-admin", type: WikiPageAccessType.ADMIN },
        ],
      }),
      page({ id: "grandchild", parentId: "child", ...restrictedToOwner }),
    ] as const;

    const asRootOwner = resolveWikiPagePermissions(
      pages,
      viewer({ citizenId: "owner-a" }),
    );
    const asRootAdminRole = resolveWikiPagePermissions(
      pages,
      viewer({ roleIds: new Set(["role-admin"]) }),
    );
    const asChildAdminRole = resolveWikiPagePermissions(
      pages,
      viewer({ roleIds: new Set(["role-other-admin"]) }),
    );

    for (const result of [asRootOwner, asRootAdminRole]) {
      expect(result.get("child")).toMatchObject({
        canRead: true,
        canEdit: true,
        canAdmin: true,
      });
      expect(result.get("grandchild")).toMatchObject({
        canRead: true,
        canEdit: true,
        canAdmin: true,
      });
    }

    // ...while a manager role that cannot even read the root gets nothing,
    // not even on the page listing it
    expect(asChildAdminRole.get("root")).toMatchObject({
      canRead: false,
      canAdmin: false,
    });
    expect(asChildAdminRole.get("child")).toMatchObject({
      canRead: false,
      canAdmin: false,
    });
    expect(asChildAdminRole.get("grandchild")).toMatchObject({
      canRead: false,
      canAdmin: false,
    });
  });

  test("a page grants nothing to someone who cannot read its parent", () => {
    const pages = [
      page({
        id: "root",
        ownerId: "someone-else",
        ...restrictedToOwner,
      }),
      page({
        id: "editable-child",
        parentId: "root",
        ownerId: "someone-else",
        ...restrictedToOwner,
        roleAccess: [
          { roleId: "role-a", type: WikiPageAccessType.EDIT },
          { roleId: "role-b", type: WikiPageAccessType.ADMIN },
        ],
      }),
      page({
        id: "owned-child",
        parentId: "root",
        ownerId: "owner-b",
        ...restrictedToOwner,
      }),
      page({
        id: "open-child",
        parentId: "root",
        ownerId: "someone-else",
        ...restrictedToOwner,
        editability: WikiPageEditability.ALL,
        visibility: WikiPageVisibility.PUBLIC,
      }),
    ] as const;

    const asEditor = resolveWikiPagePermissions(
      pages,
      viewer({ roleIds: new Set(["role-a"]) }),
    );
    const asChildManager = resolveWikiPagePermissions(
      pages,
      viewer({ roleIds: new Set(["role-b"]) }),
    );
    const asChildOwner = resolveWikiPagePermissions(
      pages,
      viewer({ citizenId: "owner-b" }),
    );
    const asStranger = resolveWikiPagePermissions(pages, viewer());

    for (const [result, pageId] of [
      [asEditor, "editable-child"],
      [asChildManager, "editable-child"],
      [asChildOwner, "owned-child"],
      [asStranger, "open-child"],
    ] as const) {
      expect(result.get(pageId)).toMatchObject({
        canRead: false,
        canEdit: false,
        canAdmin: false,
      });
    }
  });

  test("the parent gate lets through what the parent grants", () => {
    const pages = [
      page({
        id: "root",
        ownerId: "someone-else",
        ...restrictedToOwner,
        roleAccess: [{ roleId: "role-reader", type: WikiPageAccessType.READ }],
      }),
      page({
        id: "child",
        parentId: "root",
        ownerId: "someone-else",
        ...restrictedToOwner,
        roleAccess: [{ roleId: "role-reader", type: WikiPageAccessType.EDIT }],
      }),
    ] as const;

    const result = resolveWikiPagePermissions(
      pages,
      viewer({ roleIds: new Set(["role-reader"]) }),
    );

    expect(result.get("child")).toMatchObject({
      canRead: true,
      canEdit: true,
      canAdmin: false,
    });
  });

  test("wiki;manage is never locked out by the parent gate", () => {
    const pages = [
      page({ id: "root", ownerId: null, ...restrictedToOwner }),
      page({ id: "child", parentId: "root", ...restrictedToOwner }),
    ] as const;

    const result = resolveWikiPagePermissions(
      pages,
      viewer({ hasWikiManage: true }),
    );

    expect(result.get("child")).toMatchObject({
      canRead: true,
      canEdit: true,
      canAdmin: true,
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

  test("editability ALL means everyone who may read, not everyone with wiki access", () => {
    const pages = [
      page({
        id: "restricted",
        ownerId: "someone-else",
        ...restrictedToOwner,
        editability: WikiPageEditability.ALL,
        roleAccess: [{ roleId: "role-a", type: WikiPageAccessType.READ }],
      }),
      page({
        id: "public",
        ownerId: "someone-else",
        ...restrictedToOwner,
        visibility: WikiPageVisibility.PUBLIC,
        editability: WikiPageEditability.ALL,
      }),
    ] as const;

    const withRole = resolveWikiPagePermissions(
      pages,
      viewer({ roleIds: new Set(["role-a"]) }),
    );
    const withoutRole = resolveWikiPagePermissions(pages, viewer());

    expect(withRole.get("restricted")).toMatchObject({
      canRead: true,
      canEdit: true,
      canAdmin: false,
    });
    expect(withoutRole.get("restricted")).toMatchObject({
      canRead: false,
      canEdit: false,
    });
    expect(withoutRole.get("public")).toMatchObject({
      canRead: true,
      canEdit: true,
    });
  });

  test("a page resolved before its parent sees the parent's own grants", () => {
    // Regression: read, edit and admin of one page must not be mistaken for
    // a cycle when the parent's read is requested through a descendant.
    const pages = [
      page({
        id: "child",
        ownerId: "someone-else",
        visibility: WikiPageVisibility.INHERIT,
        editability: WikiPageEditability.INHERIT,
      }),
      page({
        id: "parent",
        ownerId: "someone-else",
        ...restrictedToOwner,
        editability: WikiPageEditability.RESTRICTED,
        roleAccess: [{ roleId: "role-a", type: WikiPageAccessType.EDIT }],
      }),
    ] as const;
    // The child is listed first on purpose — that is what triggered the bug
    const withChildFirst = [pages[0], { ...pages[1], parentId: null }] as const;
    const withParent = [
      { ...withChildFirst[0], parentId: "parent" },
      withChildFirst[1],
    ] as const;

    const result = resolveWikiPagePermissions(
      withParent,
      viewer({ roleIds: new Set(["role-a"]) }),
    );

    expect(result.get("parent")).toMatchObject({
      canRead: true,
      canEdit: true,
    });
    expect(result.get("child")).toMatchObject({
      canRead: true,
      canEdit: true,
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
    });
  });
});

describe("upload permissions", () => {
  /** Readable and therefore editable by everyone, owned by someone else */
  const editableByAll = {
    ownerId: "someone-else",
    ...restrictedToOwner,
    visibility: WikiPageVisibility.PUBLIC,
    editability: WikiPageEditability.ALL,
  } as const;

  test("a fully-INHERIT chain restricts uploads to admins", () => {
    const pages = [
      page({ id: "root", ...editableByAll }),
      page({ id: "child", parentId: "root" }),
    ] as const;

    const asEditor = resolveWikiPagePermissions(pages, viewer());
    const asAdmin = resolveWikiPagePermissions(
      pages,
      viewer({ citizenId: "someone-else" }),
    );

    expect(asEditor.get("child")).toMatchObject({
      canEdit: true,
      canUploadImages: false,
      canUploadAttachments: false,
    });
    expect(asAdmin.get("child")).toMatchObject({
      canAdmin: true,
      canUploadImages: true,
      canUploadAttachments: true,
    });
  });

  test("EDITORS opens the kind to everyone with edit permission — independently per kind", () => {
    const pages = [
      page({
        id: "1",
        ...editableByAll,
        imageUploadability: WikiPageUploadability.EDITORS,
        attachmentUploadability: WikiPageUploadability.RESTRICTED,
      }),
      page({
        id: "2",
        ...editableByAll,
        imageUploadability: WikiPageUploadability.RESTRICTED,
        attachmentUploadability: WikiPageUploadability.EDITORS,
      }),
    ] as const;

    const result = resolveWikiPagePermissions(pages, viewer());

    expect(result.get("1")).toMatchObject({
      canUploadImages: true,
      canUploadAttachments: false,
    });
    expect(result.get("2")).toMatchObject({
      canUploadImages: false,
      canUploadAttachments: true,
    });
  });

  test("uploading implies editing: readers get nothing from EDITORS", () => {
    const pages = [
      page({
        id: "1",
        ownerId: "someone-else",
        ...restrictedToOwner,
        visibility: WikiPageVisibility.PUBLIC,
        imageUploadability: WikiPageUploadability.EDITORS,
        attachmentUploadability: WikiPageUploadability.EDITORS,
      }),
    ] as const;

    const result = resolveWikiPagePermissions(pages, viewer());

    expect(result.get("1")).toMatchObject({
      canRead: true,
      canEdit: false,
      canUploadImages: false,
      canUploadAttachments: false,
    });
  });

  test("INHERIT resolves against the nearest ancestor, nearest setting wins", () => {
    const pages = [
      page({
        id: "root",
        ...editableByAll,
        imageUploadability: WikiPageUploadability.EDITORS,
      }),
      page({ id: "child", parentId: "root" }),
      page({
        id: "grandchild",
        parentId: "child",
        imageUploadability: WikiPageUploadability.RESTRICTED,
      }),
    ] as const;

    const result = resolveWikiPagePermissions(pages, viewer());

    expect(result.get("child")).toMatchObject({
      canUploadImages: true,
      imageUploadabilitySourceId: "root",
      attachmentUploadabilitySourceId: "root",
    });
    expect(result.get("grandchild")).toMatchObject({
      canUploadImages: false,
      imageUploadabilitySourceId: "grandchild",
    });
  });

  test("wiki;manage and effective owners may always upload", () => {
    const pages = [
      page({
        id: "1",
        ownerId: "owner",
        ...restrictedToOwner,
        imageUploadability: WikiPageUploadability.RESTRICTED,
        attachmentUploadability: WikiPageUploadability.RESTRICTED,
      }),
    ] as const;

    const asManager = resolveWikiPagePermissions(
      pages,
      viewer({ hasWikiManage: true }),
    );
    const asOwner = resolveWikiPagePermissions(
      pages,
      viewer({ citizenId: "owner" }),
    );

    expect(asManager.get("1")).toMatchObject({
      canUploadImages: true,
      canUploadAttachments: true,
    });
    expect(asOwner.get("1")).toMatchObject({
      canUploadImages: true,
      canUploadAttachments: true,
    });
  });

  test("role-based page admins may upload under RESTRICTED", () => {
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
      canAdmin: true,
      canUploadImages: true,
      canUploadAttachments: true,
    });
  });
});
