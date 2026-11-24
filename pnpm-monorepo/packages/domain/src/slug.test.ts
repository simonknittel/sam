import { describe, expect, test } from "vitest";
import { slugifyWikiPageTitle } from "./slug.js";

describe("slugify wiki page title", () => {
  test("caps the length", () => {
    expect(slugifyWikiPageTitle("a".repeat(100))).toHaveLength(64);
  });

  test("never returns an empty slug", () => {
    expect(slugifyWikiPageTitle("🚀🚀🚀")).not.toBe("");
    expect(slugifyWikiPageTitle("")).toBe("-");
  });
});
