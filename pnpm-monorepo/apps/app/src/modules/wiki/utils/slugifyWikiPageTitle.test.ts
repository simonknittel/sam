import { describe, expect, test } from "vitest";
import { slugifyWikiPageTitle } from "./slugifyWikiPageTitle";

describe("slugify wiki page title", () => {
  test("caps the length", () => {
    expect(slugifyWikiPageTitle("a".repeat(100))).toHaveLength(64);
  });

  test("never returns an empty slug", () => {
    // The slug package falls back to a base64-derived slug for input
    // without any mappable characters
    expect(slugifyWikiPageTitle("🚀🚀🚀")).not.toBe("");
    expect(slugifyWikiPageTitle("")).toBe("-");
  });
});
