// Tests for @sam-monorepo/wiki-editor deliberately hosted in the app because vitest is set up here.
import { isWikiIframeSrcAllowed } from "@sam-monorepo/wiki-editor";
import { describe, expect, test } from "vitest";

describe("isWikiIframeSrcAllowed", () => {
  const allowlist = ["example.com", "maps.google.com"];

  test.each([
    "https://example.com/page",
    "https://sub.example.com/page",
    "https://deep.sub.example.com/",
    "https://maps.google.com/embed?x=1",
  ])("allows %s", (src) => {
    expect(isWikiIframeSrcAllowed(src, allowlist)).toBe(true);
  });

  test.each([
    "http://example.com/page",
    "https://example.com.evil.net/page",
    "https://notexample.com/",
    "https://google.com/",
    "https://evilmaps.google.com.attacker.io/",
    "javascript:alert(1)",
    "not a url",
    "",
  ])("rejects %s", (src) => {
    expect(isWikiIframeSrcAllowed(src, allowlist)).toBe(false);
  });

  test("rejects everything with an empty allowlist", () => {
    expect(isWikiIframeSrcAllowed("https://example.com/", [])).toBe(false);
  });

  test("ignores empty allowlist entries", () => {
    expect(isWikiIframeSrcAllowed("https://example.com/", [""])).toBe(false);
  });
});
