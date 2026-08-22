import { describe, expect, test } from "vitest";
import {
  getUploadUsages,
  UploadUsageType,
  type UploadUsageSource,
} from "./uploadUsage";

const emptyUpload: UploadUsageSource = {
  roleIcons: [],
  roleThumbnails: [],
  manufacturers: [],
  eventCovers: [],
  wikiPageIcons: [],
  wikiPages: [],
};

describe("get upload usages", () => {
  test("an upload nothing references is unused", () => {
    expect(getUploadUsages(emptyUpload)).toEqual([]);
  });

  test("links each usage to the page owning the reference", () => {
    const usages = getUploadUsages({
      ...emptyUpload,
      roleIcons: [{ id: "role-1", name: "Aufklärer" }],
      manufacturers: [{ id: "manufacturer-1", name: "Drake" }],
      eventCovers: [{ id: "event-1", name: "Operation Pitchfork" }],
    });

    expect(usages).toEqual([
      {
        type: UploadUsageType.RoleIcon,
        key: "roleIcon:role-1",
        label: "Aufklärer",
        href: "/app/roles/role-1",
      },
      {
        type: UploadUsageType.ManufacturerLogo,
        key: "manufacturerLogo:manufacturer-1",
        label: "Drake",
        href: "/app/fleet/settings/manufacturer/manufacturer-1",
      },
      {
        type: UploadUsageType.EventCover,
        key: "eventCover:event-1",
        label: "Operation Pitchfork",
        href: "/app/events/event-1",
      },
    ]);
  });

  test("lists every wiki page an upload is embedded in", () => {
    const usages = getUploadUsages({
      ...emptyUpload,
      wikiPages: [
        {
          id: "page-1",
          title: "Erste Seite",
          slug: "erste-seite",
          eventId: null,
          templateId: null,
        },
        {
          id: "page-2",
          title: "Zweite Seite",
          slug: "zweite-seite",
          eventId: null,
          templateId: null,
        },
      ],
    });

    expect(usages.map((usage) => usage.href)).toEqual([
      "/app/wiki/page-1/erste-seite",
      "/app/wiki/page-2/zweite-seite",
    ]);
  });

  test("points event wiki pages at their briefing, not the global wiki", () => {
    const [usage] = getUploadUsages({
      ...emptyUpload,
      wikiPageIcons: [
        {
          id: "page-1",
          title: "BRIEFING",
          slug: "briefing",
          eventId: "event-1",
          templateId: null,
        },
      ],
    });

    expect(usage).toMatchObject({
      type: UploadUsageType.WikiPageIcon,
      href: "/app/events/event-1/briefing/page-1/briefing",
    });
  });

  test("keeps the icon and the attachment reference of one page apart", () => {
    const page = {
      id: "page-1",
      title: "Seite",
      slug: "seite",
      eventId: null,
      templateId: null,
    };

    const usages = getUploadUsages({
      ...emptyUpload,
      wikiPageIcons: [page],
      wikiPages: [page],
    });

    expect(usages.map((usage) => usage.type)).toEqual([
      UploadUsageType.WikiPageIcon,
      UploadUsageType.WikiPageAttachment,
    ]);
    expect(new Set(usages.map((usage) => usage.key)).size).toBe(2);
  });
});
