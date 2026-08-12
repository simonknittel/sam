import {
  WikiPageEventScope,
  WikiPageUploadability,
} from "@sam-monorepo/database/browser";
import { describe, expect, test } from "vitest";
import {
  collectPositionScopeIdsForCitizen,
  resolveEventWikiPagePermissions,
  type EventWikiPagePermissionSource,
  type EventWikiViewer,
} from "./index.js";

const page = (
  overrides: Partial<EventWikiPagePermissionSource> & { id: string },
): EventWikiPagePermissionSource => ({
  parentId: null,
  eventReadScope: WikiPageEventScope.INHERIT,
  eventReadScopePositionId: null,
  eventEditScope: WikiPageEventScope.INHERIT,
  eventEditScopePositionId: null,
  imageUploadability: WikiPageUploadability.INHERIT,
  attachmentUploadability: WikiPageUploadability.INHERIT,
  ...overrides,
});

const viewer = (overrides: Partial<EventWikiViewer> = {}): EventWikiViewer => ({
  isParticipant: false,
  isEventManager: false,
  positionScopeIds: new Set(),
  ...overrides,
});

const resolve = (
  pages: readonly EventWikiPagePermissionSource[],
  currentViewer: EventWikiViewer,
  frozen = false,
) => resolveEventWikiPagePermissions(pages, currentViewer, { frozen });

describe("resolve event wiki page permissions", () => {
  test("event managers hold all tiers on managers-only pages", () => {
    const pages = [
      page({
        id: "root",
        eventReadScope: WikiPageEventScope.MANAGERS,
        eventEditScope: WikiPageEventScope.MANAGERS,
      }),
    ] as const;

    const asManager = resolve(pages, viewer({ isEventManager: true }));
    const asParticipant = resolve(pages, viewer({ isParticipant: true }));

    expect(asManager.get("root")).toMatchObject({
      canRead: true,
      canEdit: true,
      canAdmin: true,
    });
    expect(asParticipant.get("root")).toMatchObject({
      canRead: false,
      canEdit: false,
      canAdmin: false,
    });
  });

  test("read scope ALL grants reading but not editing", () => {
    const pages = [
      page({
        id: "root",
        eventReadScope: WikiPageEventScope.ALL,
        eventEditScope: WikiPageEventScope.MANAGERS,
      }),
    ] as const;

    const result = resolve(pages, viewer());

    expect(result.get("root")).toMatchObject({
      canRead: true,
      canEdit: false,
      canAdmin: false,
    });
  });

  test("read scope PARTICIPANTS requires an RSVP", () => {
    const pages = [
      page({
        id: "root",
        eventReadScope: WikiPageEventScope.PARTICIPANTS,
        eventEditScope: WikiPageEventScope.MANAGERS,
      }),
    ] as const;

    const asParticipant = resolve(pages, viewer({ isParticipant: true }));
    const asOutsider = resolve(pages, viewer());

    expect(asParticipant.get("root")).toMatchObject({ canRead: true });
    expect(asOutsider.get("root")).toMatchObject({ canRead: false });
  });

  test("read scope POSITION requires an assignment inside the subtree", () => {
    const pages = [
      page({
        id: "root",
        eventReadScope: WikiPageEventScope.POSITION,
        eventReadScopePositionId: "squad",
        eventEditScope: WikiPageEventScope.MANAGERS,
      }),
    ] as const;

    const asMember = resolve(
      pages,
      viewer({ positionScopeIds: new Set(["squad", "wing"]) }),
    );
    const asOther = resolve(
      pages,
      viewer({ positionScopeIds: new Set(["wing"]) }),
    );

    expect(asMember.get("root")).toMatchObject({ canRead: true });
    expect(asOther.get("root")).toMatchObject({ canRead: false });
  });

  test("a dangling POSITION scope degrades to managers only", () => {
    const pages = [
      page({
        id: "root",
        eventReadScope: WikiPageEventScope.POSITION,
        eventReadScopePositionId: null,
        eventEditScope: WikiPageEventScope.MANAGERS,
      }),
    ] as const;

    const asParticipant = resolve(
      pages,
      viewer({ isParticipant: true, positionScopeIds: new Set(["squad"]) }),
    );
    const asManager = resolve(pages, viewer({ isEventManager: true }));

    expect(asParticipant.get("root")).toMatchObject({ canRead: false });
    expect(asManager.get("root")).toMatchObject({ canRead: true });
  });

  test("edit scope POSITION grants subtree members editing and, implied, reading", () => {
    const pages = [
      page({
        id: "root",
        eventReadScope: WikiPageEventScope.MANAGERS,
        eventEditScope: WikiPageEventScope.POSITION,
        eventEditScopePositionId: "squad",
      }),
    ] as const;

    const asMember = resolve(
      pages,
      viewer({ positionScopeIds: new Set(["squad", "wing"]) }),
    );
    const asSibling = resolve(
      pages,
      viewer({ positionScopeIds: new Set(["wing"]) }),
    );

    expect(asMember.get("root")).toMatchObject({
      canRead: true,
      canEdit: true,
    });
    expect(asSibling.get("root")).toMatchObject({
      canRead: false,
      canEdit: false,
    });
  });

  test("a page grants nothing to someone who cannot read its parent", () => {
    const pages = [
      page({
        id: "root",
        eventReadScope: WikiPageEventScope.PARTICIPANTS,
        eventEditScope: WikiPageEventScope.MANAGERS,
      }),
      page({
        id: "child",
        parentId: "root",
        eventReadScope: WikiPageEventScope.ALL,
        eventEditScope: WikiPageEventScope.ALL,
      }),
    ] as const;

    const asOutsider = resolve(pages, viewer());
    const asParticipant = resolve(pages, viewer({ isParticipant: true }));

    expect(asOutsider.get("child")).toMatchObject({
      canRead: false,
      canEdit: false,
    });
    expect(asParticipant.get("child")).toMatchObject({
      canRead: true,
      canEdit: true,
    });
  });

  test("INHERIT takes the nearest ancestor's explicit scope", () => {
    const pages = [
      page({
        id: "root",
        eventReadScope: WikiPageEventScope.PARTICIPANTS,
        eventEditScope: WikiPageEventScope.PARTICIPANTS,
      }),
      page({ id: "child", parentId: "root" }),
      page({ id: "grandchild", parentId: "child" }),
    ] as const;

    const asParticipant = resolve(pages, viewer({ isParticipant: true }));
    const asOutsider = resolve(pages, viewer());

    expect(asParticipant.get("grandchild")).toMatchObject({
      canRead: true,
      canEdit: true,
      readScopeSourceId: "root",
      editScopeSourceId: "root",
    });
    expect(asOutsider.get("grandchild")).toMatchObject({
      canRead: false,
      canEdit: false,
    });
  });

  test("INHERIT on a top-level page means managers only", () => {
    const pages = [page({ id: "root" })] as const;

    const asParticipant = resolve(pages, viewer({ isParticipant: true }));
    const asManager = resolve(pages, viewer({ isEventManager: true }));

    expect(asParticipant.get("root")).toMatchObject({ canRead: false });
    expect(asManager.get("root")).toMatchObject({ canRead: true });
  });

  test("uploading defaults to the managers and EDITORS extends it", () => {
    const pages = [
      page({
        id: "root",
        eventReadScope: WikiPageEventScope.PARTICIPANTS,
        eventEditScope: WikiPageEventScope.PARTICIPANTS,
      }),
      page({
        id: "open",
        parentId: "root",
        imageUploadability: WikiPageUploadability.EDITORS,
      }),
      page({ id: "inheriting", parentId: "open" }),
    ] as const;

    const asParticipant = resolve(pages, viewer({ isParticipant: true }));
    const asManager = resolve(pages, viewer({ isEventManager: true }));

    expect(asParticipant.get("root")).toMatchObject({
      canEdit: true,
      canUploadImages: false,
      canUploadAttachments: false,
    });
    expect(asManager.get("root")).toMatchObject({
      canUploadImages: true,
      canUploadAttachments: true,
    });
    /** EDITORS on "open" is inherited by "inheriting" (nearest setting wins) */
    expect(asParticipant.get("open")).toMatchObject({
      canUploadImages: true,
      canUploadAttachments: false,
      imageUploadabilitySourceId: "open",
    });
    expect(asParticipant.get("inheriting")).toMatchObject({
      canUploadImages: true,
      imageUploadabilitySourceId: "open",
    });
  });

  test("the freeze stops uploading even for managers", () => {
    const pages = [
      page({
        id: "root",
        eventReadScope: WikiPageEventScope.PARTICIPANTS,
        eventEditScope: WikiPageEventScope.PARTICIPANTS,
        imageUploadability: WikiPageUploadability.EDITORS,
        attachmentUploadability: WikiPageUploadability.EDITORS,
      }),
    ] as const;

    const asManager = resolve(pages, viewer({ isEventManager: true }), true);

    expect(asManager.get("root")).toMatchObject({
      canUploadImages: false,
      canUploadAttachments: false,
    });
  });

  test("edit implies read", () => {
    const pages = [
      page({
        id: "root",
        eventReadScope: WikiPageEventScope.MANAGERS,
        eventEditScope: WikiPageEventScope.PARTICIPANTS,
      }),
    ] as const;

    const asParticipant = resolve(pages, viewer({ isParticipant: true }));

    expect(asParticipant.get("root")).toMatchObject({
      canRead: true,
      canEdit: true,
    });
  });

  test("edit scope ALL means everyone who may read the page", () => {
    const pages = [
      page({
        id: "root",
        eventReadScope: WikiPageEventScope.PARTICIPANTS,
        eventEditScope: WikiPageEventScope.ALL,
      }),
    ] as const;

    const asParticipant = resolve(pages, viewer({ isParticipant: true }));
    const asOutsider = resolve(pages, viewer());

    expect(asParticipant.get("root")).toMatchObject({
      canRead: true,
      canEdit: true,
    });
    expect(asOutsider.get("root")).toMatchObject({
      canRead: false,
      canEdit: false,
    });
  });

  test("the freeze stops editing but keeps reading and manage views", () => {
    const pages = [
      page({
        id: "root",
        eventReadScope: WikiPageEventScope.MANAGERS,
        eventEditScope: WikiPageEventScope.PARTICIPANTS,
      }),
    ] as const;

    const asParticipant = resolve(pages, viewer({ isParticipant: true }), true);
    const asManager = resolve(pages, viewer({ isEventManager: true }), true);

    expect(asParticipant.get("root")).toMatchObject({
      canRead: true,
      canEdit: false,
      canUploadImages: false,
      canUploadAttachments: false,
    });
    expect(asManager.get("root")).toMatchObject({
      canRead: true,
      canEdit: false,
      canAdmin: true,
    });
  });

  test("a parent cycle denies instead of hanging", () => {
    const pages = [
      page({
        id: "a",
        parentId: "b",
        eventReadScope: WikiPageEventScope.ALL,
      }),
      page({ id: "b", parentId: "a" }),
    ] as const;

    const result = resolve(pages, viewer({ isParticipant: true }));

    expect(result.get("a")).toMatchObject({ canRead: false });
    expect(result.get("b")).toMatchObject({ canRead: false });
  });

  test("a broken chain counts as top level and stays inheritable-safe", () => {
    const pages = [
      page({
        id: "orphan",
        parentId: "missing",
        eventReadScope: WikiPageEventScope.ALL,
      }),
    ] as const;

    const result = resolve(pages, viewer());

    expect(result.get("orphan")).toMatchObject({ canRead: true });
  });
});

describe("collect position scope ids for a citizen", () => {
  test("collects assigned positions and all of their ancestors", () => {
    const positions = [
      { id: "fleet", parentPositionId: null, citizenId: null },
      { id: "wing", parentPositionId: "fleet", citizenId: null },
      { id: "squad", parentPositionId: "wing", citizenId: "viewer" },
      { id: "other", parentPositionId: "fleet", citizenId: "someone-else" },
    ] as const;

    const scopeIds = collectPositionScopeIdsForCitizen(positions, "viewer");

    expect(scopeIds).toEqual(new Set(["squad", "wing", "fleet"]));
  });

  test("returns nothing without a citizen or assignment", () => {
    const positions = [
      { id: "fleet", parentPositionId: null, citizenId: "someone-else" },
    ] as const;

    expect(collectPositionScopeIdsForCitizen(positions, null).size).toBe(0);
    expect(collectPositionScopeIdsForCitizen(positions, "viewer").size).toBe(0);
  });

  test("survives a corrupted parent cycle", () => {
    const positions = [
      { id: "a", parentPositionId: "b", citizenId: "viewer" },
      { id: "b", parentPositionId: "a", citizenId: null },
    ] as const;

    const scopeIds = collectPositionScopeIdsForCitizen(positions, "viewer");

    expect(scopeIds).toEqual(new Set(["a", "b"]));
  });
});
