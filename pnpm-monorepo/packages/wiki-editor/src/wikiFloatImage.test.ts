import { DOMParser } from "@tiptap/pm/model";
import { renderToHTMLString } from "@tiptap/static-renderer";
import { describe, expect, test } from "vitest";
import { getWikiEditorExtensions, getWikiEditorSchema } from "./index.js";

const schema = getWikiEditorSchema();
const extensions = getWikiEditorExtensions();

const SOURCE = "https://files.example.com/cm123";

const paragraphWithFloatImage = (attrs: Readonly<Record<string, unknown>>) => ({
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        { type: "wikiFloatImage", attrs },
        { type: "text", text: "Fließtext" },
      ],
    },
  ],
});

/** The same renderer the read-only page view uses (WikiPageStaticContent) */
const render = (content: unknown) =>
  renderToHTMLString({
    content: schema.nodeFromJSON(content),
    extensions,
  });

describe("the floated image", () => {
  test("is an inline node living inside the paragraph", () => {
    const nodeType = schema.nodes.wikiFloatImage;
    if (!nodeType) throw new Error("No wikiFloatImage node in the schema");

    expect(nodeType.isInline).toBe(true);
    expect(
      schema.nodes.paragraph?.contentMatch.matchType(nodeType),
    ).toBeTruthy();
  });

  test("renders the float side and width on the anchor around the image", () => {
    const html = render(
      paragraphWithFloatImage({
        src: SOURCE,
        floatSide: "right",
        widthPx: 320,
      }),
    );

    expect(html).toMatch(
      /<a [^>]*data-wiki-float-image=""[^>]*data-float-side="right"/,
    );
    expect(html).toMatch(/<a [^>]*style="[^"]*float: right/);
    expect(html).toMatch(
      /<a [^>]*data-width-px="320"[^>]*style="[^"]*width: 320px; max-width: 100%/,
    );
    expect(html).toContain(
      `<img loading="lazy" decoding="async" src="${SOURCE}"/>`,
    );
  });

  test("defaults to the left side and carries no block-position attribute", () => {
    const html = render(paragraphWithFloatImage({ src: SOURCE }));

    expect(html).toMatch(/<a [^>]*data-float-side="left"/);
    // The block image's `align` margins must not reach the anchor
    expect(html).not.toMatch(/<a [^>]*data-align/);
    expect(html).not.toMatch(/<a [^>]*style="[^"]*margin/);
  });

  /**
   * The link mark claims every `a[href]`; without a higher priority its
   * rule would win and the float side and width stored on the anchor would
   * be lost when the markup is pasted back.
   */
  test("is parsed before the link mark when the markup is pasted back", () => {
    const { rules } = DOMParser.fromSchema(schema);
    const floatImageRule = rules.findIndex(
      (rule) => rule.tag === "a[data-wiki-float-image]",
    );
    const linkRule = rules.findIndex((rule) => rule.mark === "link");

    expect(floatImageRule).toBeGreaterThanOrEqual(0);
    expect(linkRule).toBeGreaterThanOrEqual(0);
    expect(floatImageRule).toBeLessThan(linkRule);
  });

  /**
   * Foreign img markup and the block image's own anchor markup must keep
   * parsing as block images — only the float node's marker may float.
   */
  test("claims no markup beyond its own marker", () => {
    const floatImageRules = schema.nodes.wikiFloatImage?.spec.parseDOM ?? [];

    expect(floatImageRules).toHaveLength(1);
    expect(floatImageRules[0]?.tag).toBe("a[data-wiki-float-image]");
  });
});
