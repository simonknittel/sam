import { describe, expect, test } from "vitest";
import {
  expandWikiPages,
  hasAnyWikiPageExpanded,
  isWikiPageExpanded,
  parseWikiExpandedPagesCookie,
  serializeWikiExpandedPagesCookie,
  setWikiPageExpansion,
  WIKI_ALL_COLLAPSED,
  WIKI_ALL_EXPANDED,
  WIKI_EXPANDED_PAGES_COOKIE,
  type WikiExpansionState,
} from "./wikiExpandedPagesCookie";

/** Page ids are 24 character cuid2s, of which only the last 8 are stored */
const pageId = (key: string) => `prefix0000000000${key}`;

const cookieValue = (state: WikiExpansionState) => {
  const serialized = serializeWikiExpandedPagesCookie(state);

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

  test("reads a plain list as the expanded pages", () => {
    const state = parseWikiExpandedPagesCookie("a1b2c3d4,e5f6g7h8");

    expect(state.inverted).toBe(false);
    expect(isWikiPageExpanded(state, pageId("a1b2c3d4"))).toBe(true);
    expect(isWikiPageExpanded(state, pageId("e5f6g7h8"))).toBe(true);
    expect(isWikiPageExpanded(state, pageId("zzzzzzzz"))).toBe(false);
  });

  test("reads a leading marker as everything expanded except the listed pages", () => {
    const state = parseWikiExpandedPagesCookie("*,a1b2c3d4");

    expect(state.inverted).toBe(true);
    expect(isWikiPageExpanded(state, pageId("a1b2c3d4"))).toBe(false);
    expect(isWikiPageExpanded(state, pageId("zzzzzzzz"))).toBe(true);
  });

  test("reads a lone marker as everything expanded", () => {
    expect(parseWikiExpandedPagesCookie("*")).toBe(WIKI_ALL_EXPANDED);
  });

  test("drops entries that cannot be page keys", () => {
    const state = parseWikiExpandedPagesCookie(
      "a1b2c3d4,short,WITHCAPS,with-dash,waytoolongentry,,e5f6g7h8",
    );

    expect([...state.keys]).toEqual(["a1b2c3d4", "e5f6g7h8"]);
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

    expect(parseWikiExpandedPagesCookie(keys.join(",")).keys.size).toBe(350);
  });
});

describe("serializeWikiExpandedPagesCookie", () => {
  test("round-trips both modes", () => {
    const expanded = expandWikiPages(WIKI_ALL_COLLAPSED, [
      pageId("a1b2c3d4"),
      pageId("e5f6g7h8"),
    ]);
    const inverted = setWikiPageExpansion(
      WIKI_ALL_EXPANDED,
      pageId("a1b2c3d4"),
      false,
    );

    expect(parseWikiExpandedPagesCookie(cookieValue(expanded))).toEqual(
      expanded,
    );
    expect(parseWikiExpandedPagesCookie(cookieValue(inverted))).toEqual(
      inverted,
    );
  });

  test("expires the cookie when everything is collapsed", () => {
    expect(serializeWikiExpandedPagesCookie(WIKI_ALL_COLLAPSED)).toContain(
      "max-age=0",
    );
  });

  test("stores everything expanded as a single marker", () => {
    expect(cookieValue(WIKI_ALL_EXPANDED)).toBe("*");
  });

  test("keeps the most recent entries when the cap is exceeded", () => {
    const ids = Array.from({ length: 360 }, (_unused, index) =>
      pageId(`a${index.toString().padStart(7, "0")}`),
    );

    const value = cookieValue(expandWikiPages(WIKI_ALL_COLLAPSED, ids));

    expect(value.split(",")).toHaveLength(350);
    expect(value.startsWith("a0000010,")).toBe(true);
  });
});

describe("setWikiPageExpansion", () => {
  test("expands and collapses in the plain mode", () => {
    const expanded = setWikiPageExpansion(
      WIKI_ALL_COLLAPSED,
      pageId("a1b2c3d4"),
      true,
    );
    expect(isWikiPageExpanded(expanded, pageId("a1b2c3d4"))).toBe(true);

    const collapsed = setWikiPageExpansion(expanded, pageId("a1b2c3d4"), false);
    expect(isWikiPageExpanded(collapsed, pageId("a1b2c3d4"))).toBe(false);
  });

  test("expands and collapses in the inverted mode", () => {
    const collapsed = setWikiPageExpansion(
      WIKI_ALL_EXPANDED,
      pageId("a1b2c3d4"),
      false,
    );
    expect(collapsed.inverted).toBe(true);
    expect(isWikiPageExpanded(collapsed, pageId("a1b2c3d4"))).toBe(false);
    expect(isWikiPageExpanded(collapsed, pageId("e5f6g7h8"))).toBe(true);

    const expanded = setWikiPageExpansion(collapsed, pageId("a1b2c3d4"), true);
    expect(expanded).toEqual(WIKI_ALL_EXPANDED);
  });

  test("returns the same state when nothing changes", () => {
    expect(
      setWikiPageExpansion(WIKI_ALL_COLLAPSED, pageId("a1b2c3d4"), false),
    ).toBe(WIKI_ALL_COLLAPSED);
    expect(
      setWikiPageExpansion(WIKI_ALL_EXPANDED, pageId("a1b2c3d4"), true),
    ).toBe(WIKI_ALL_EXPANDED);
  });
});

describe("expandWikiPages", () => {
  test("returns the same state when every page is already expanded", () => {
    const state = expandWikiPages(WIKI_ALL_COLLAPSED, [pageId("a1b2c3d4")]);

    expect(expandWikiPages(state, [pageId("a1b2c3d4")])).toBe(state);
    expect(expandWikiPages(WIKI_ALL_EXPANDED, [pageId("a1b2c3d4")])).toBe(
      WIKI_ALL_EXPANDED,
    );
    expect(expandWikiPages(WIKI_ALL_COLLAPSED, [])).toBe(WIKI_ALL_COLLAPSED);
  });

  test("removes pages from the collapsed list in the inverted mode", () => {
    const collapsed = setWikiPageExpansion(
      WIKI_ALL_EXPANDED,
      pageId("a1b2c3d4"),
      false,
    );

    expect(expandWikiPages(collapsed, [pageId("a1b2c3d4")]).keys.size).toBe(0);
  });
});

describe("hasAnyWikiPageExpanded", () => {
  test("distinguishes a fully collapsed tree from any expansion", () => {
    expect(hasAnyWikiPageExpanded(WIKI_ALL_COLLAPSED)).toBe(false);
    expect(hasAnyWikiPageExpanded(WIKI_ALL_EXPANDED)).toBe(true);
    expect(
      hasAnyWikiPageExpanded(
        expandWikiPages(WIKI_ALL_COLLAPSED, [pageId("a1b2c3d4")]),
      ),
    ).toBe(true);
    expect(
      hasAnyWikiPageExpanded(
        setWikiPageExpansion(WIKI_ALL_EXPANDED, pageId("a1b2c3d4"), false),
      ),
    ).toBe(true);
  });
});
