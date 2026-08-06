import { getWikiEditorSchema } from "@sam-monorepo/wiki-editor";
import type { JSONContent } from "@tiptap/core";
import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { describe, expect, test } from "vitest";
import {
  findWikiTrailingEmptyParagraph,
  withoutWikiTrailingEmptyParagraph,
} from "./wikiTrailingParagraph";

const schema = getWikiEditorSchema();

const paragraph = (text?: string): JSONContent => ({
  type: "paragraph",
  ...(text ? { content: [{ type: "text", text }] } : {}),
});

const doc = (...content: JSONContent[]): JSONContent => ({
  type: "doc",
  content,
});

describe("withoutWikiTrailingEmptyParagraph", () => {
  test("drops the trailing empty paragraph", () => {
    const result = withoutWikiTrailingEmptyParagraph(
      doc(paragraph("Inhalt"), paragraph()),
    );

    expect(result).toEqual(doc(paragraph("Inhalt")));
  });

  test("keeps a trailing paragraph with content", () => {
    const content = doc(paragraph("Inhalt"), paragraph("Mehr"));

    expect(withoutWikiTrailingEmptyParagraph(content)).toEqual(content);
  });

  test("keeps the empty paragraph of an otherwise empty document", () => {
    const content = doc(paragraph());

    expect(withoutWikiTrailingEmptyParagraph(content)).toEqual(content);
  });

  test("keeps the empty paragraphs authors leave between blocks", () => {
    const content = doc(paragraph("Inhalt"), paragraph(), paragraph("Mehr"));

    expect(withoutWikiTrailingEmptyParagraph(content)).toEqual(content);
  });
});

describe("findWikiTrailingEmptyParagraph", () => {
  const range = (content: JSONContent) =>
    findWikiTrailingEmptyParagraph(ProseMirrorNode.fromJSON(schema, content));

  test("returns the position of the trailing empty paragraph", () => {
    const content = doc(paragraph("Inhalt"), paragraph());

    const result = range(content);

    const document = ProseMirrorNode.fromJSON(schema, content);
    expect(result).not.toBeNull();
    expect(document.nodeAt(result!.from)).toBe(document.lastChild);
    expect(result!.to).toBe(document.content.size);
  });

  test("returns null for a trailing paragraph with content", () => {
    expect(range(doc(paragraph("Inhalt"), paragraph("Mehr")))).toBeNull();
  });

  test("returns null for an otherwise empty document", () => {
    expect(range(doc(paragraph()))).toBeNull();
  });
});
