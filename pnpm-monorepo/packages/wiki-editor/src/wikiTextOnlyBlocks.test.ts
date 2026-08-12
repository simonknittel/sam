import { Fragment, Slice } from "@tiptap/pm/model";
import { EditorState, TextSelection } from "@tiptap/pm/state";
import { describe, expect, test } from "vitest";
import {
  getWikiEditorSchema,
  getWikiPositionRestrictions,
  getWikiSelectionRestrictions,
  stripWikiTextOnlyAlignment,
} from "./index.js";

const schema = getWikiEditorSchema();

const paragraph = (text?: string, textAlign?: string) => ({
  type: "paragraph",
  ...(textAlign ? { attrs: { textAlign } } : {}),
  ...(text ? { content: [{ type: "text", text }] } : {}),
});

const heading = (text: string) => ({
  type: "heading",
  attrs: { level: 1 },
  content: [{ type: "text", text }],
});

const bulletList = (...items: unknown[]) => ({
  type: "bulletList",
  content: items,
});

const listItem = (...content: unknown[]) => ({ type: "listItem", content });

const doc = (...content: unknown[]) => ({ type: "doc", content });

const checkedDoc = (...content: unknown[]) => {
  const node = schema.nodeFromJSON(doc(...content));
  node.check();
  return node;
};

const table = (...cellContent: unknown[]) => ({
  type: "table",
  content: [
    {
      type: "tableRow",
      content: [{ type: "tableCell", content: cellContent }],
    },
  ],
});

describe("text-only blocks schema", () => {
  test("quotes accept paragraphs with marks", () => {
    expect(() =>
      checkedDoc({
        type: "blockquote",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Zitat", marks: [{ type: "bold" }] },
              {
                type: "text",
                text: " markiert",
                marks: [{ type: "highlight", attrs: { color: "#fef08a" } }],
              },
              {
                type: "text",
                text: " gefärbt",
                marks: [{ type: "wikiTextColor", attrs: { color: "red" } }],
              },
            ],
          },
          paragraph("— Quelle"),
        ],
      }),
    ).not.toThrow();
  });

  test.each([
    ["heading", heading("H")],
    ["bulletList", bulletList(listItem(paragraph()))],
    ["codeBlock", { type: "codeBlock" }],
    ["image", { type: "image", attrs: { src: "https://example.com/a.png" } }],
    ["blockquote", { type: "blockquote", content: [paragraph()] }],
    ["table", table(paragraph())],
  ])("quotes reject %s children", (_label, child) => {
    expect(() =>
      checkedDoc({ type: "blockquote", content: [child] }),
    ).toThrow();
  });

  test("table cells accept paragraphs and reject blocks", () => {
    expect(() => checkedDoc(table(paragraph("Zelle")))).not.toThrow();
    expect(() => checkedDoc(table(heading("H")))).toThrow();
    expect(() => checkedDoc(table(table(paragraph())))).toThrow();
  });

  test("table headers reject blocks", () => {
    expect(() =>
      checkedDoc({
        type: "table",
        content: [
          {
            type: "tableRow",
            content: [
              {
                type: "tableHeader",
                content: [{ type: "codeBlock" }],
              },
            ],
          },
        ],
      }),
    ).toThrow();
  });

  test("headings hold plain text only", () => {
    expect(() =>
      checkedDoc({
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: "Fett", marks: [{ type: "bold" }] }],
      }),
    ).not.toThrow();
    expect(() =>
      checkedDoc({
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "wikiCitizenMention", attrs: { citizenId: "x" } }],
      }),
    ).toThrow();
    expect(() =>
      checkedDoc({
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "hardBreak" }],
      }),
    ).toThrow();
  });

  test("list items accept paragraphs and nested lists, nothing else", () => {
    expect(() =>
      checkedDoc(
        bulletList(
          listItem(paragraph("Punkt"), bulletList(listItem(paragraph()))),
        ),
      ),
    ).not.toThrow();
    expect(() =>
      checkedDoc(bulletList(listItem(paragraph(), heading("H")))),
    ).toThrow();
    expect(() =>
      checkedDoc(
        bulletList(
          listItem(paragraph(), {
            type: "image",
            attrs: { src: "https://example.com/a.png" },
          }),
        ),
      ),
    ).toThrow();
    expect(() =>
      checkedDoc({
        type: "taskList",
        content: [
          {
            type: "taskItem",
            attrs: { checked: false },
            content: [
              paragraph(),
              { type: "blockquote", content: [paragraph()] },
            ],
          },
        ],
      }),
    ).toThrow();
  });

  test("replacing into a quote never nests the foreign block inside it", () => {
    const state = EditorState.create({
      schema,
      doc: checkedDoc({
        type: "blockquote",
        content: [paragraph("Vorher nachher")],
      }),
    });
    /** What paste and drag'n'drop boil down to: a fitted replace */
    const insertAt = 5;
    const transaction = state.tr.replaceRange(
      insertAt,
      insertAt,
      new Slice(Fragment.from(schema.nodeFromJSON(heading("Eingefügt"))), 0, 0),
    );
    const result = state.apply(transaction);
    result.doc.check();
    result.doc.descendants((node) => {
      if (node.type.name !== "blockquote") return true;
      node.forEach((child) => expect(child.type.name).toBe("paragraph"));
      return false;
    });
  });
});

describe("wiki text restrictions", () => {
  /**
   * One block of every restricted kind. Text positions: 2 = leading
   * paragraph, 13 = heading, 20 = code block, 28 = list-item paragraph,
   * 38 = details summary, 56 = quote paragraph.
   */
  const state = EditorState.create({
    schema,
    doc: checkedDoc(
      paragraph("Außerhalb"),
      heading("Titel"),
      { type: "codeBlock", content: [{ type: "text", text: "code" }] },
      bulletList(listItem(paragraph("Punkt"))),
      {
        type: "details",
        content: [
          {
            type: "detailsSummary",
            content: [{ type: "text", text: "Kopf" }],
          },
          { type: "detailsContent", content: [paragraph("Inhalt")] },
        ],
      },
      { type: "blockquote", content: [paragraph("Zitat")] },
    ),
  });

  const restrictionsAt = (position: number) =>
    getWikiSelectionRestrictions(
      state.apply(
        state.tr.setSelection(TextSelection.create(state.doc, position)),
      ),
    );

  test("plain paragraphs are unrestricted", () => {
    expect(restrictionsAt(2)).toStrictEqual({
      blocks: false,
      grids: false,
      lists: false,
      inlineNodes: false,
      marks: false,
      smallText: false,
      alignment: false,
      slashItems: "all",
    });
  });

  test("headings only forbid inline nodes", () => {
    expect(restrictionsAt(13)).toStrictEqual({
      blocks: false,
      grids: false,
      lists: false,
      inlineNodes: true,
      marks: false,
      smallText: false,
      alignment: false,
      slashItems: "noInline",
    });
  });

  test("code blocks forbid everything", () => {
    expect(restrictionsAt(20)).toStrictEqual({
      blocks: true,
      grids: true,
      lists: true,
      inlineNodes: true,
      marks: true,
      smallText: false,
      alignment: true,
      slashItems: "none",
    });
  });

  test("list items keep list toggles available", () => {
    expect(restrictionsAt(28)).toStrictEqual({
      blocks: true,
      grids: true,
      lists: false,
      inlineNodes: false,
      marks: false,
      smallText: false,
      alignment: true,
      slashItems: "textOnly",
    });
  });

  test("details summaries forbid blocks but keep marks", () => {
    expect(restrictionsAt(38)).toStrictEqual({
      blocks: true,
      grids: true,
      lists: true,
      inlineNodes: true,
      marks: false,
      smallText: false,
      alignment: true,
      slashItems: "none",
    });
  });

  test("quotes forbid blocks, lists and alignment", () => {
    expect(restrictionsAt(56)).toStrictEqual({
      blocks: true,
      grids: true,
      lists: true,
      inlineNodes: false,
      marks: false,
      smallText: false,
      alignment: true,
      slashItems: "textOnly",
    });
  });

  test("selections spanning outside stay unrestricted", () => {
    const spanning = getWikiSelectionRestrictions(
      state.apply(
        state.tr.setSelection(TextSelection.create(state.doc, 2, 58)),
      ),
    );
    expect(spanning.blocks).toBe(false);
    expect(spanning.alignment).toBe(false);
  });

  test("position restrictions derive from the ancestors", () => {
    /** Before the paragraph inside the quote (quote starts at 53) */
    expect(getWikiPositionRestrictions(state.doc, 54).blocks).toBe(true);
    /** Before the quote itself, at document level */
    expect(getWikiPositionRestrictions(state.doc, 53).blocks).toBe(false);
  });
});

describe("stripWikiTextOnlyAlignment", () => {
  test("resets alignment inside text-only containers only", () => {
    const state = EditorState.create({
      schema,
      doc: checkedDoc(
        paragraph("Außerhalb", "center"),
        { type: "blockquote", content: [paragraph("Zitat", "right")] },
        table(paragraph("Zelle", "center")),
        bulletList(
          listItem(
            paragraph("Punkt", "right"),
            bulletList(listItem(paragraph("Unterpunkt", "center"))),
          ),
        ),
      ),
    });

    const transaction = stripWikiTextOnlyAlignment(state);
    expect(transaction).not.toBeNull();
    const result = state.apply(transaction!);

    const alignments: (string | null)[] = [];
    result.doc.descendants((node) => {
      if (node.type.name === "paragraph")
        alignments.push((node.attrs.textAlign as string | null) ?? null);
      return true;
    });
    expect(alignments).toStrictEqual(["center", null, null, null, null]);
  });

  test("returns null when nothing needs fixing", () => {
    const state = EditorState.create({
      schema,
      doc: checkedDoc({ type: "blockquote", content: [paragraph("Ok")] }),
    });
    expect(stripWikiTextOnlyAlignment(state)).toBeNull();
  });
});
