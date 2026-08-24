import { describe, expect, test, vi } from "vitest";
import { markdownToPlainText } from "./markdownToPlainText";

/** The module is server-side only; the marker package has no meaning here. */
vi.mock("server-only", () => ({}));

describe("markdownToPlainText", () => {
  test("removes the characters of bold, italic and strikethrough text", () => {
    expect(markdownToPlainText("**bold** *italic* ~~gone~~")).toBe(
      "bold italic gone",
    );
  });

  test("removes the characters of underlined text", () => {
    expect(markdownToPlainText("__underline__")).toBe("underline");
  });

  test("keeps the label and the address of a link", () => {
    expect(markdownToPlainText("[the label](https://example.com/)")).toBe(
      "the label (https://example.com/)",
    );
  });

  test("writes a bare address only once", () => {
    expect(markdownToPlainText("visit https://example.com/ now")).toBe(
      "visit https://example.com/ now",
    );
    // `remark-gfm` adds a scheme to these two, but the user never typed it
    expect(markdownToPlainText("besuche www.example.com")).toBe(
      "besuche www.example.com",
    );
    expect(markdownToPlainText("schreib an mail@example.com")).toBe(
      "schreib an mail@example.com",
    );
  });

  test("keeps the characters of the multi-line quote of Discord", () => {
    expect(markdownToPlainText(">>> first\nsecond")).toBe(">>> first\nsecond");
  });

  test("removes the characters of a heading", () => {
    expect(markdownToPlainText("# Briefing\n\nText")).toBe("Briefing\n\nText");
  });

  test("keeps an unordered and an ordered list", () => {
    expect(markdownToPlainText("* first\n* second")).toBe("- first\n- second");
    expect(markdownToPlainText("1. first\n2. second")).toBe(
      "1. first\n2. second",
    );
  });

  test("keeps the text of a code block and of inline code", () => {
    expect(markdownToPlainText("```js\nconst value = 1;\n```")).toBe(
      "const value = 1;",
    );
    expect(markdownToPlainText("the `value` of it")).toBe("the value of it");
  });

  test("keeps the characters of a table, one line for each row", () => {
    expect(markdownToPlainText("| a | b |\n| - | - |\n| 1 | 2 |")).toBe(
      "| a | b |\n| - | - |\n| 1 | 2 |",
    );
  });

  test("keeps a literal star character", () => {
    expect(markdownToPlainText("5 * 3 = 15")).toBe("5 * 3 = 15");
  });

  test("keeps the line structure of a description", () => {
    expect(markdownToPlainText("first line\nsecond line")).toBe(
      "first line\nsecond line",
    );
  });

  test("keeps a text that has no format", () => {
    expect(markdownToPlainText("A normal description.")).toBe(
      "A normal description.",
    );
  });

  test("gives an empty result for a description that is not set", () => {
    expect(markdownToPlainText("")).toBe("");
    expect(markdownToPlainText(null)).toBe("");
    expect(markdownToPlainText(undefined)).toBe("");
  });
});
