import { describe, expect, test } from "vitest";
import { slugifyWikiPageTitle } from "./slugifyWikiPageTitle";

describe("slugify wiki page title", () => {
  test("lowercases and replaces spaces", () => {
    expect(slugifyWikiPageTitle("Boots On The Ground")).toBe(
      "boots-on-the-ground",
    );
  });

  test("transliterates German umlauts", () => {
    expect(slugifyWikiPageTitle("Übungsgefecht für Anfänger")).toBe(
      "uebungsgefecht-fuer-anfaenger",
    );
    expect(slugifyWikiPageTitle("Straße")).toBe("strasse");
  });

  test("strips other diacritics and special characters", () => {
    expect(slugifyWikiPageTitle("Café & Bar: №1!")).toBe("cafe-bar-1");
  });

  test("trims leading/trailing dashes and caps the length", () => {
    expect(slugifyWikiPageTitle("---Hello---")).toBe("hello");
    expect(slugifyWikiPageTitle("a".repeat(100))).toHaveLength(64);
  });

  test("never returns an empty slug", () => {
    // The slug package falls back to a base64-derived slug for input
    // without any mappable characters
    expect(slugifyWikiPageTitle("🚀🚀🚀")).not.toBe("");
    expect(slugifyWikiPageTitle("")).toBe("-");
  });
});
