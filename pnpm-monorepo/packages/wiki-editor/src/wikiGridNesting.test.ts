import { Fragment, Slice } from "@tiptap/pm/model";
import { EditorState, TextSelection } from "@tiptap/pm/state";
import { describe, expect, test } from "vitest";
import {
  getWikiEditorSchema,
  getWikiPositionRestrictions,
  getWikiSelectionRestrictions,
} from "./index.js";

const schema = getWikiEditorSchema();

const paragraph = (text?: string) => ({
  type: "paragraph",
  ...(text ? { content: [{ type: "text", text }] } : {}),
});

const doc = (...content: unknown[]) => ({ type: "doc", content });

const checkedDoc = (...content: unknown[]) => {
  const node = schema.nodeFromJSON(doc(...content));
  node.check();
  return node;
};

const gridCell = (...content: unknown[]) => ({
  type: "wikiGridCell",
  content,
});

const grid = (...cells: unknown[]) => ({
  type: "wikiGrid",
  attrs: { columns: cells.length },
  content: cells,
});

const callout = (...content: unknown[]) => ({
  type: "wikiCallout",
  attrs: { color: "blue" },
  content,
});

describe("grid nesting schema", () => {
  test("grids sit at document level next to regular blocks", () => {
    expect(() =>
      checkedDoc(
        paragraph("Davor"),
        grid(gridCell(paragraph("Links")), gridCell(paragraph("Rechts"))),
        paragraph("Danach"),
      ),
    ).not.toThrow();
  });

  test("grid cells accept regular blocks", () => {
    expect(() =>
      checkedDoc(
        grid(
          gridCell(
            { type: "heading", attrs: { level: 2 }, content: [] },
            { type: "codeBlock" },
            callout(paragraph("Hinweis")),
          ),
          gridCell(paragraph()),
        ),
      ),
    ).not.toThrow();
  });

  test("grid cells reject grids", () => {
    expect(() =>
      checkedDoc(
        grid(
          gridCell(grid(gridCell(paragraph()), gridCell(paragraph()))),
          gridCell(paragraph()),
        ),
      ),
    ).toThrow();
  });

  test("callouts and collapsible sections host grids", () => {
    expect(() =>
      checkedDoc(callout(grid(gridCell(paragraph()), gridCell(paragraph()))), {
        type: "details",
        content: [
          { type: "detailsSummary", content: [{ type: "text", text: "K" }] },
          {
            type: "detailsContent",
            content: [grid(gridCell(paragraph()), gridCell(paragraph()))],
          },
        ],
      }),
    ).not.toThrow();
  });

  test("replacing into a grid cell never nests a grid inside it", () => {
    const state = EditorState.create({
      schema,
      doc: checkedDoc(
        grid(gridCell(paragraph("Vorher")), gridCell(paragraph())),
      ),
    });
    /** What paste and drag'n'drop boil down to: a fitted replace */
    const insertAt = 3;
    const transaction = state.tr.replaceRange(
      insertAt,
      insertAt,
      new Slice(
        Fragment.from(
          schema.nodeFromJSON(
            grid(gridCell(paragraph("Neu")), gridCell(paragraph())),
          ),
        ),
        0,
        0,
      ),
    );
    const result = state.apply(transaction);
    result.doc.check();
    result.doc.descendants((node) => {
      if (node.type.name !== "wikiGrid") return true;
      node.descendants((child) => expect(child.type.name).not.toBe("wikiGrid"));
      return false;
    });
  });
});

describe("grid restrictions", () => {
  /**
   * A paragraph, then a two-column grid whose second cell holds a callout
   * — the indirect-nesting case the schema alone cannot rule out. Text
   * positions: 2 = leading paragraph, 14 = first-cell paragraph,
   * 24 = callout paragraph inside the second cell.
   */
  const state = EditorState.create({
    schema,
    doc: checkedDoc(
      paragraph("Außerhalb"),
      grid(
        gridCell(paragraph("Zelle")),
        gridCell(callout(paragraph("Hinweis"))),
      ),
    ),
  });

  const restrictionsAt = (position: number) =>
    getWikiSelectionRestrictions(
      state.apply(
        state.tr.setSelection(TextSelection.create(state.doc, position)),
      ),
    );

  test("outside a grid, grids stay available", () => {
    expect(restrictionsAt(2).grids).toBe(false);
  });

  test("grid cells only forbid grids", () => {
    expect(restrictionsAt(14)).toStrictEqual({
      blocks: false,
      grids: true,
      lists: false,
      inlineNodes: false,
      marks: false,
      smallText: false,
      alignment: false,
      slashItems: "all",
    });
  });

  test("callouts inside grid cells still forbid grids", () => {
    expect(restrictionsAt(24).grids).toBe(true);
    expect(restrictionsAt(24).blocks).toBe(false);
  });

  test("position restrictions derive from the ancestors", () => {
    /** Before the paragraph inside the first cell (grid starts at 11) */
    expect(getWikiPositionRestrictions(state.doc, 13).grids).toBe(true);
    /** Before the grid itself, at document level */
    expect(getWikiPositionRestrictions(state.doc, 11).grids).toBe(false);
  });
});
