import { describe, expect, test } from "vitest";
import {
  collectWikiMentionedCitizenIds,
  collectWikiVariantLinkIds,
  createWikiHeadingIdAssigner,
  extractWikiPageText,
} from "./index.js";

const document = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Übungsgefecht" }],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Hallo " },
        { type: "text", text: "Welt", marks: [{ type: "bold" }] },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Ablauf" }],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Ablauf" }],
    },
    { type: "paragraph" },
  ],
};

describe("extract wiki page text", () => {
  test("collects text nodes with block boundaries as spaces", () => {
    expect(extractWikiPageText(document)).toBe(
      "Übungsgefecht Hallo Welt Ablauf Ablauf",
    );
  });

  test("handles empty and invalid input", () => {
    expect(extractWikiPageText(null)).toBe("");
    expect(extractWikiPageText({})).toBe("");
    expect(extractWikiPageText("nope")).toBe("");
  });

  test("includes citizen mention handles", () => {
    expect(
      extractWikiPageText({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Gefunden von" },
              {
                type: "wikiCitizenMention",
                attrs: { citizenId: "abc123", handle: "Chris" },
              },
            ],
          },
        ],
      }),
    ).toBe("Gefunden von Chris");
  });

  test("includes variant link names", () => {
    expect(
      extractWikiPageText({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Wir fliegen" },
              {
                type: "wikiVariantLink",
                attrs: { variantId: "abc123", name: "Carrack" },
              },
              /** Pasted as a URL — no name to index yet */
              {
                type: "wikiVariantLink",
                attrs: { variantId: "def456", name: null },
              },
            ],
          },
        ],
      }),
    ).toBe("Wir fliegen Carrack");
  });
});

describe("collect variant link ids", () => {
  test("collects unique ids from nested content", () => {
    expect(
      collectWikiVariantLinkIds({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "wikiVariantLink",
                attrs: { variantId: "abc123", name: "Carrack" },
              },
              {
                type: "wikiVariantLink",
                attrs: { variantId: "abc123", name: "Carrack" },
              },
            ],
          },
          {
            type: "blockquote",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "wikiVariantLink",
                    attrs: { variantId: "def456", name: "Caterpillar" },
                  },
                ],
              },
            ],
          },
        ],
      }),
    ).toEqual(["abc123", "def456"]);
  });

  test("handles empty and invalid input", () => {
    expect(collectWikiVariantLinkIds(null)).toEqual([]);
    expect(collectWikiVariantLinkIds({})).toEqual([]);
    expect(collectWikiVariantLinkIds("nope")).toEqual([]);
  });
});

describe("collect mentioned citizen ids", () => {
  test("collects unique ids from nested content", () => {
    expect(
      collectWikiMentionedCitizenIds({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "wikiCitizenMention",
                attrs: { citizenId: "abc123", handle: "Chris" },
              },
              {
                type: "wikiCitizenMention",
                attrs: { citizenId: "abc123", handle: "Chris" },
              },
            ],
          },
          {
            type: "blockquote",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "wikiCitizenMention",
                    attrs: { citizenId: "def456", handle: "Sam" },
                  },
                ],
              },
            ],
          },
        ],
      }),
    ).toEqual(["abc123", "def456"]);
  });

  test("handles empty and invalid input", () => {
    expect(collectWikiMentionedCitizenIds(null)).toEqual([]);
    expect(collectWikiMentionedCitizenIds({})).toEqual([]);
    expect(collectWikiMentionedCitizenIds("nope")).toEqual([]);
  });
});

describe("wiki heading id assigner", () => {
  /**
   * The static renderer and the live editor walk EVERY heading and ask the
   * shared assigner for an id — slugified, deduplicated with a numeric
   * suffix, and empty/whitespace-only headings get null (no id attribute)
   * without shifting later ids, so both renderers stay aligned.
   */
  test("slugifies, deduplicates and skips empty headings", () => {
    const nextHeadingId = createWikiHeadingIdAssigner();
    expect(
      ["Übungsgefecht", "Ablauf", "Ablauf", "", "   "].map((text) =>
        nextHeadingId(text),
      ),
    ).toEqual(["uebungsgefecht", "ablauf", "ablauf-2", null, null]);
  });
});
