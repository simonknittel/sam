import { DiscordMarkdown } from "@/modules/common/components/DiscordMarkdown";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

const render = (markdown: string) =>
  renderToStaticMarkup(<DiscordMarkdown>{markdown}</DiscordMarkdown>);

describe("formats that Discord renders", () => {
  test("shows bold, italic and bold italic text", () => {
    expect(render("**bold** *italic* _italic_ ***both***")).toContain(
      "<strong>bold</strong> <em>italic</em> <em>italic</em> <em><strong>both</strong></em>",
    );
  });

  test("shows two underscore characters as underlined text", () => {
    expect(render("__underline__")).toContain("<u>underline</u>");
  });

  test("shows strikethrough text", () => {
    expect(render("~~gone~~")).toContain("<del>gone</del>");
  });

  test("shows inline code and a code block", () => {
    const html = render("`inline`\n\n```js\nconst value = 1;\n```");
    expect(html).toContain("<code>inline</code>");
    expect(html).toContain("const value = 1;");
  });

  test("shows the three headings of Discord", () => {
    const html = render("# one\n\n## two\n\n### three");
    expect(html).toContain("<h1>one</h1>");
    expect(html).toContain("<h2>two</h2>");
    expect(html).toContain("<h3>three</h3>");
  });

  test("shows a block quote", () => {
    expect(render("> quoted")).toContain("<blockquote>");
  });

  test("shows an unordered and an ordered list", () => {
    expect(render("- first\n- second")).toContain("<ul>");
    expect(render("1. first\n2. second")).toContain("<ol>");
  });

  test("shows a link with a label", () => {
    expect(render("[label](https://example.com/)")).toContain(
      '<a href="https://example.com/" target="_blank" rel="noreferrer">label</a>',
    );
  });

  test("shows a bare URL as a link", () => {
    expect(render("visit https://example.com/ now")).toContain(
      '<a href="https://example.com/" target="_blank" rel="noreferrer">https://example.com/</a>',
    );
  });

  test("keeps a line break inside a paragraph", () => {
    expect(render("first\nsecond")).toContain("<br/>");
  });
});

describe("formats that Discord does not render", () => {
  test("shows the characters of a table", () => {
    const html = render("| a | b |\n| - | - |\n| 1 | 2 |");
    expect(html).not.toContain("<table>");
    expect(html).toContain("| a | b |");
    expect(html).toContain("| 1 | 2 |");
  });

  test("shows the characters of an image", () => {
    const html = render("![alt](https://example.com/picture.png)");
    expect(html).not.toContain("<img");
    expect(html).toContain("![alt](https://example.com/picture.png)");
  });

  test("shows the characters of a horizontal rule", () => {
    const html = render("above\n\n---\n\nbelow");
    expect(html).not.toContain("<hr");
    expect(html).toContain("---");
  });

  test("shows the characters of a heading with four or more hashes", () => {
    const html = render("#### four\n\n##### five");
    expect(html).not.toContain("<h4>");
    expect(html).not.toContain("<h5>");
    expect(html).toContain("#### four");
    expect(html).toContain("##### five");
  });

  test("shows the characters of a footnote", () => {
    const html = render("text[^1]\n\n[^1]: the note");
    expect(html).not.toContain("<sup>");
    expect(html).toContain("[^1]");
    expect(html).toContain("[^1]: the note");
  });

  test("keeps the list of a task list but shows the check box as characters", () => {
    const html = render("- [ ] open\n- [x] done");
    expect(html).not.toContain("<input");
    expect(html).toContain("<ul>");
    expect(html).toContain("[ ] open");
    expect(html).toContain("[x] done");
  });

  test("shows the characters of raw HTML", () => {
    const html = render("<b>not bold</b>");
    expect(html).not.toContain("<b>not bold</b>");
    expect(html).toContain("&lt;b&gt;not bold&lt;/b&gt;");
  });

  test("shows the characters of the formats that only Discord has", () => {
    // The app has no parser code for these three formats, thus they stay text
    expect(render("||spoiler||")).toContain("||spoiler||");
    expect(render("-# subtext")).toContain("-# subtext");

    const multiLineQuote = render(">>> first\nsecond");
    expect(multiLineQuote).not.toContain("<blockquote>");
    expect(multiLineQuote).toContain("&gt;&gt;&gt; first");
  });

  test("still shows a block quote with one or two characters", () => {
    expect(render("> quoted")).toContain("<blockquote>");
    expect(render("> > quoted")).toContain("<blockquote>");
  });

  test("shows the characters of a reference link and its definition", () => {
    const html = render("[label][target]\n\n[target]: https://example.com/");
    expect(html).not.toContain("<a ");
    expect(html).toContain("[label][target]");
    expect(html).toContain("[target]: https://example.com/");
  });
});

describe("text without a format", () => {
  test("keeps a description that has no format characters", () => {
    expect(render("A normal description.")).toContain(
      "<p>A normal description.</p>",
    );
  });

  test("shows nothing for an empty description", () => {
    expect(render("")).toBe(
      '<div class="prose prose-invert max-w-none" style="overflow-wrap:anywhere"></div>',
    );
  });

  test("does not show a dangerous URL scheme but keeps the label", () => {
    const html = render("[click](javascript:alert(1))");
    expect(html).not.toContain("javascript:");
    expect(html).toContain("click");
  });
});
