import { describe, expect, test } from "vitest";
import {
  EVENT_WIKI_EXPANDED_PAGES_COOKIE,
  expandWikiPages,
  isWikiPageExpanded,
  parseWikiExpandedPagesCookie,
  serializeWikiExpandedPagesCookie,
  setWikiPageExpansion,
  VARIANT_WIKI_EXPANDED_PAGES_COOKIE,
  WIKI_ALL_COLLAPSED,
  WIKI_EXPANDED_PAGES_COOKIE,
  type WikiExpansionState,
} from "./wikiExpandedPagesCookie";
import { WikiScope } from "./wikiPageHref";

/** Page ids are 24 character cuid2s, of which only the last 8 are stored */
const pageId = (key: string) => `prefix0000000000${key}`;

const cookieValue = (state: WikiExpansionState) => {
  const serialized = serializeWikiExpandedPagesCookie(state, WikiScope.Wiki);

  return serialized.slice(
    `${WIKI_EXPANDED_PAGES_COOKIE}=`.length,
    serialized.indexOf(";"),
  );
};

describe("parseWikiExpandedPagesCookie", () => {
  test("treats a missing or empty cookie as everything collapsed", () => {
    expect(parseWikiExpandedPagesCookie(undefined)).toBe(WIKI_ALL_COLLAPSED);
    expect(parseWikiExpandedPagesCookie("")).toBe(WIKI_ALL_COLLAPSED);
  });

  test("reads the value as the expanded pages", () => {
    const state = parseWikiExpandedPagesCookie("a1b2c3d4,e5f6g7h8");

    expect(isWikiPageExpanded(state, pageId("a1b2c3d4"))).toBe(true);
    expect(isWikiPageExpanded(state, pageId("e5f6g7h8"))).toBe(true);
    expect(isWikiPageExpanded(state, pageId("zzzzzzzz"))).toBe(false);
  });

  test("drops entries that cannot be page keys", () => {
    const state = parseWikiExpandedPagesCookie(
      "a1b2c3d4,short,WITHCAPS,with-dash,waytoolongentry,,e5f6g7h8",
    );

    expect([...state]).toEqual(["a1b2c3d4", "e5f6g7h8"]);
  });

  test("ignores an oversized value instead of parsing it", () => {
    const oversized = Array.from({ length: 500 }, () => "a1b2c3d4").join(",");

    expect(parseWikiExpandedPagesCookie(oversized)).toBe(WIKI_ALL_COLLAPSED);
  });

  test("caps how many entries a value may contribute", () => {
    const keys = Array.from(
      { length: 400 },
      (_unused, index) => `a${index.toString().padStart(7, "0")}`,
    );

    expect(parseWikiExpandedPagesCookie(keys.join(",")).size).toBe(350);
  });
});

describe("serializeWikiExpandedPagesCookie", () => {
  test("round-trips the expanded pages", () => {
    const state = expandWikiPages(WIKI_ALL_COLLAPSED, [
      pageId("a1b2c3d4"),
      pageId("e5f6g7h8"),
    ]);

    expect(parseWikiExpandedPagesCookie(cookieValue(state))).toEqual(state);
  });

  test("expires the cookie when everything is collapsed", () => {
    expect(
      serializeWikiExpandedPagesCookie(WIKI_ALL_COLLAPSED, WikiScope.Wiki),
    ).toContain("max-age=0");
  });

  test("keeps the most recent entries when the cap is exceeded", () => {
    const ids = Array.from({ length: 360 }, (_unused, index) =>
      pageId(`a${index.toString().padStart(7, "0")}`),
    );

    const value = cookieValue(expandWikiPages(WIKI_ALL_COLLAPSED, ids));

    expect(value.split(",")).toHaveLength(350);
    expect(value.startsWith("a0000010,")).toBe(true);
  });

  test("uses one cookie name and path per scope", () => {
    const state = expandWikiPages(WIKI_ALL_COLLAPSED, [pageId("a1b2c3d4")]);

    expect(serializeWikiExpandedPagesCookie(state, WikiScope.Wiki)).toContain(
      `${WIKI_EXPANDED_PAGES_COOKIE}=a1b2c3d4; path=/app/wiki;`,
    );
    expect(serializeWikiExpandedPagesCookie(state, WikiScope.Event)).toContain(
      `${EVENT_WIKI_EXPANDED_PAGES_COOKIE}=a1b2c3d4; path=/app/events;`,
    );
    expect(
      serializeWikiExpandedPagesCookie(state, WikiScope.Variant),
    ).toContain(
      `${VARIANT_WIKI_EXPANDED_PAGES_COOKIE}=a1b2c3d4; path=/app/fleet/variant;`,
    );
  });
});

describe("setWikiPageExpansion", () => {
  test("expands and collapses a single page", () => {
    const expanded = setWikiPageExpansion(
      WIKI_ALL_COLLAPSED,
      pageId("a1b2c3d4"),
      true,
    );
    expect(isWikiPageExpanded(expanded, pageId("a1b2c3d4"))).toBe(true);

    const collapsed = setWikiPageExpansion(expanded, pageId("a1b2c3d4"), false);
    expect(isWikiPageExpanded(collapsed, pageId("a1b2c3d4"))).toBe(false);
  });

  test("leaves the other pages untouched", () => {
    const expanded = expandWikiPages(WIKI_ALL_COLLAPSED, [
      pageId("a1b2c3d4"),
      pageId("e5f6g7h8"),
    ]);

    const collapsed = setWikiPageExpansion(expanded, pageId("a1b2c3d4"), false);

    expect(isWikiPageExpanded(collapsed, pageId("a1b2c3d4"))).toBe(false);
    expect(isWikiPageExpanded(collapsed, pageId("e5f6g7h8"))).toBe(true);
  });

  test("returns the same state when nothing changes", () => {
    expect(
      setWikiPageExpansion(WIKI_ALL_COLLAPSED, pageId("a1b2c3d4"), false),
    ).toBe(WIKI_ALL_COLLAPSED);

    const expanded = expandWikiPages(WIKI_ALL_COLLAPSED, [pageId("a1b2c3d4")]);
    expect(setWikiPageExpansion(expanded, pageId("a1b2c3d4"), true)).toBe(
      expanded,
    );
  });
});

describe("expandWikiPages", () => {
  test("returns the same state when every page is already expanded", () => {
    const state = expandWikiPages(WIKI_ALL_COLLAPSED, [pageId("a1b2c3d4")]);

    expect(expandWikiPages(state, [pageId("a1b2c3d4")])).toBe(state);
    expect(expandWikiPages(WIKI_ALL_COLLAPSED, [])).toBe(WIKI_ALL_COLLAPSED);
  });

  test("keeps the pages that are already expanded", () => {
    const state = expandWikiPages(
      expandWikiPages(WIKI_ALL_COLLAPSED, [pageId("a1b2c3d4")]),
      [pageId("e5f6g7h8")],
    );

    expect([...state]).toEqual(["a1b2c3d4", "e5f6g7h8"]);
  });
});
