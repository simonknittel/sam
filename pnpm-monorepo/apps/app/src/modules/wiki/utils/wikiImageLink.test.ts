import {
  getWikiEditorExtensions,
  getWikiEditorSchema,
} from "@sam-monorepo/wiki-editor";
import { DOMParser } from "@tiptap/pm/model";
import { renderToHTMLString } from "@tiptap/static-renderer";
import { describe, expect, test } from "vitest";

const schema = getWikiEditorSchema();
const extensions = getWikiEditorExtensions();

const SOURCE = "https://files.example.com/cm123";

const image = (attrs: Readonly<Record<string, unknown>>) => ({
  type: "doc",
  content: [{ type: "image", attrs }],
});

/** The same renderer the read-only page view uses (WikiPageStaticContent) */
const render = (content: unknown) =>
  renderToHTMLString({
    content: schema.nodeFromJSON(content),
    extensions,
  });

/**
 * Stub of our own rendered markup. Vitest runs without a DOM here, and the
 * image's parse rules only read tag names, attributes and the image inside
 * the anchor — a real document would just add a dependency for the same
 * coverage.
 */
const renderedAnchor = (
  attributes: Readonly<Record<string, string>>,
  imageAttributes: Readonly<Record<string, string>> | null,
) =>
  ({
    tagName: "A",
    getAttribute: (name: string) => attributes[name] ?? null,
    querySelector: (selector: string) =>
      selector === "img" && imageAttributes
        ? { getAttribute: (name: string) => imageAttributes[name] ?? null }
        : null,
    style: {},
  }) as unknown as HTMLElement;

/**
 * Runs the image's own parse rule for our anchor markup against the stub.
 * NULL when the rule rejects the element.
 */
const parseRenderedAnchor = (element: HTMLElement) => {
  const rule = schema.nodes.image.spec.parseDOM?.find(
    (candidate) => "tag" in candidate && candidate.tag === "a[data-wiki-image]",
  );
  if (!rule?.getAttrs) throw new Error("No parse rule for the image link");
  const parsed = rule.getAttrs(element);
  if (parsed === false) return null;
  return schema.nodes.image.create(parsed ?? undefined).attrs;
};

describe("the link to an image's original", () => {
  test("wraps the image in a link to its source, opening in a new tab", () => {
    const html = render(image({ src: SOURCE, alt: "Karte.png" }));

    expect(html).toBe(
      `<a data-wiki-image="" href="${SOURCE}" target="_blank" ` +
        `rel="noopener noreferrer" style="margin-left: auto; margin-right: auto">` +
        `<img src="${SOURCE}" alt="Karte.png"/>` +
        `</a>`,
    );
  });

  test("carries the layout styles on the link, not on the image", () => {
    const html = render(image({ src: SOURCE, widthPx: 720, align: "right" }));

    expect(html).toMatch(
      /<a [^>]*data-width-px="720"[^>]*style="[^"]*width: 720px[^"]*"/,
    );
    expect(html).toMatch(/<a [^>]*margin-left: auto; margin-right: 0/);
    // The image itself is left to fill that box, see wikiEditor.css
    expect(html).toContain(`<img src="${SOURCE}"/>`);
  });

  test("renders a bare image when there is nothing to link to", () => {
    const html = render(image({ src: null, widthPx: 720 }));

    expect(html).not.toContain("<a");
    expect(html).toMatch(/<img [^>]*data-width-px="720"/);
  });

  /**
   * The link mark claims every `a[href]`; without a higher priority its
   * rule would win, the anchor would parse as a plain link and the image
   * inside it would lose the width and alignment stored on the anchor.
   */
  test("is parsed before the link mark when the markup is pasted back", () => {
    const { rules } = DOMParser.fromSchema(schema);
    const imageRule = rules.findIndex(
      (rule) => rule.tag === "a[data-wiki-image]",
    );
    const linkRule = rules.findIndex((rule) => rule.mark === "link");

    expect(imageRule).toBeGreaterThanOrEqual(0);
    expect(linkRule).toBeGreaterThanOrEqual(0);
    expect(imageRule).toBeLessThan(linkRule);
  });

  test("reads the image back from inside the anchor", () => {
    const attrs = parseRenderedAnchor(
      renderedAnchor(
        {
          "data-wiki-image": "",
          href: SOURCE,
          "data-width-px": "720",
          "data-align": "right",
        },
        { src: SOURCE, alt: "Karte.png" },
      ),
    );

    expect(attrs).toMatchObject({
      src: SOURCE,
      alt: "Karte.png",
      widthPx: 720,
      align: "right",
    });
  });

  test("rejects an anchor without an image and base64 sources", () => {
    expect(
      parseRenderedAnchor(renderedAnchor({ "data-wiki-image": "" }, null)),
    ).toBeNull();
    expect(
      parseRenderedAnchor(
        renderedAnchor({ "data-wiki-image": "" }, { src: "data:image/png,x" }),
      ),
    ).toBeNull();
  });
});
