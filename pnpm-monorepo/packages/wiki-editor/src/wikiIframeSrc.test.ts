import { describe, expect, test } from "vitest";
import { collectWikiIframeSrcs, isWikiIframeSrcAllowed } from "./index.js";

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

describe("collectWikiIframeSrcs", () => {
  test("collects generic-iframe embeds, also nested, but no other providers", () => {
    const content = {
      type: "doc",
      content: [
        {
          type: "wikiEmbed",
          attrs: { provider: "iframe", src: "https://example.com/a" },
        },
        {
          type: "wikiEmbed",
          attrs: {
            provider: "youtube",
            src: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
          },
        },
        {
          type: "wikiGrid",
          content: [
            {
              type: "wikiGridCell",
              content: [
                {
                  type: "wikiEmbed",
                  attrs: { provider: "iframe", src: "https://example.com/b" },
                },
              ],
            },
          ],
        },
      ],
    };

    expect(collectWikiIframeSrcs(content).sort()).toEqual([
      "https://example.com/a",
      "https://example.com/b",
    ]);
  });
});
