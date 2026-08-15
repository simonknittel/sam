import { describe, expect, test } from "vitest";
import {
  buildWikiPageHref,
  buildWikiPageSnapshotsHref,
  buildWikiTagHref,
  createEventWikiHrefMode,
  createVariantWikiHrefMode,
  getActiveWikiPageId,
  getWikiPageRouteHref,
  GLOBAL_WIKI_HREF_MODE,
} from "./wikiPageHref";

const page = { id: "page000000000000000000ab", slug: "some-page" };
const rootPage = { id: "root000000000000000000cd", slug: "root-page" };

const eventMode = createEventWikiHrefMode(
  "event0000000000000000001",
  rootPage.id,
);
const variantMode = createVariantWikiHrefMode("variant1", rootPage.id);

describe("buildWikiPageHref", () => {
  test("builds global wiki hrefs", () => {
    expect(buildWikiPageHref(GLOBAL_WIKI_HREF_MODE, page)).toBe(
      `/app/wiki/${page.id}/${page.slug}`,
    );
  });

  test("collapses the event root to the bare base path", () => {
    expect(buildWikiPageHref(eventMode, rootPage)).toBe(eventMode.basePath);
    expect(buildWikiPageHref(eventMode, page)).toBe(
      `${eventMode.basePath}/${page.id}/${page.slug}`,
    );
  });

  test("collapses the variant root to the plain variant URL", () => {
    expect(buildWikiPageHref(variantMode, rootPage)).toBe(
      "/app/fleet/variant/variant1",
    );
    expect(buildWikiPageHref(variantMode, page)).toBe(
      `/app/fleet/variant/variant1/wiki/${page.id}/${page.slug}`,
    );
  });
});

describe("getActiveWikiPageId", () => {
  test("resolves the variant root on the plain variant URL", () => {
    expect(
      getActiveWikiPageId(variantMode, "/app/fleet/variant/variant1"),
    ).toBe(rootPage.id);
  });

  test("resolves the variant root on the bare wiki base path", () => {
    expect(
      getActiveWikiPageId(variantMode, "/app/fleet/variant/variant1/wiki"),
    ).toBe(rootPage.id);
  });

  test("resolves subpages under the wiki base path", () => {
    expect(
      getActiveWikiPageId(
        variantMode,
        `/app/fleet/variant/variant1/wiki/${page.id}/${page.slug}`,
      ),
    ).toBe(page.id);
  });

  test("resolves nothing outside the base path", () => {
    expect(
      getActiveWikiPageId(variantMode, "/app/fleet/variant/other"),
    ).toBeUndefined();
    expect(getActiveWikiPageId(variantMode, "/app/wiki")).toBeUndefined();
  });

  test("keeps the global behavior", () => {
    expect(
      getActiveWikiPageId(GLOBAL_WIKI_HREF_MODE, "/app/wiki"),
    ).toBeUndefined();
    expect(
      getActiveWikiPageId(
        GLOBAL_WIKI_HREF_MODE,
        `/app/wiki/${page.id}/${page.slug}`,
      ),
    ).toBe(page.id);
  });
});

describe("buildWikiTagHref", () => {
  test("links event tags inside the briefing", () => {
    expect(buildWikiTagHref(eventMode, "tag1")).toBe(
      `${eventMode.basePath}/tags/tag1`,
    );
  });

  test("links global and variant tags to the global wiki", () => {
    expect(buildWikiTagHref(GLOBAL_WIKI_HREF_MODE, "tag1")).toBe(
      "/app/wiki/tags/tag1",
    );
    expect(buildWikiTagHref(variantMode, "tag1")).toBe("/app/wiki/tags/tag1");
  });
});

describe("buildWikiPageSnapshotsHref", () => {
  test("never collapses to the root href, also for the root page", () => {
    expect(buildWikiPageSnapshotsHref(variantMode, rootPage.id)).toBe(
      `/app/fleet/variant/variant1/wiki/${rootPage.id}/snapshots`,
    );
    expect(buildWikiPageSnapshotsHref(GLOBAL_WIKI_HREF_MODE, page.id)).toBe(
      `/app/wiki/${page.id}/snapshots`,
    );
  });
});

describe("getWikiPageRouteHref", () => {
  test("routes WIKI pages to the global wiki regardless of variant links", () => {
    expect(getWikiPageRouteHref({ ...page, eventId: null })).toBe(
      `/app/wiki/${page.id}/${page.slug}`,
    );
  });
});
