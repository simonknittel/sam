import { EditorState, TextSelection } from "@tiptap/pm/state";
import { renderToHTMLString } from "@tiptap/static-renderer";
import { describe, expect, test } from "vitest";
import {
  getWikiEditorExtensions,
  getWikiEditorSchema,
  getWikiSelectionRestrictions,
  stripWikiSmallTextInSmallBlocks,
  type WikiTextSize,
} from "./index.js";

const schema = getWikiEditorSchema();
const extensions = getWikiEditorExtensions();

const doc = (...content: unknown[]) => ({ type: "doc", content });

const small = [{ type: "wikiSmallText" }];

const paragraph = (
  text: string,
  textSize?: string,
  marks?: readonly { type: string }[],
) => ({
  type: "paragraph",
  ...(textSize ? { attrs: { textSize } } : {}),
  content: [{ type: "text", text, ...(marks ? { marks } : {}) }],
});

const bulletList = (textSize?: string, ...items: unknown[]) => ({
  type: "bulletList",
  ...(textSize ? { attrs: { textSize } } : {}),
  content: items.length
    ? items
    : [{ type: "listItem", content: [paragraph("Eintrag")] }],
});

const listItem = (...content: unknown[]) => ({ type: "listItem", content });

const stateOf = (...content: unknown[]) => {
  const node = schema.nodeFromJSON(doc(...content));
  node.check();
  return EditorState.create({ schema, doc: node });
};

const hasSmallTextMark = (state: EditorState) => {
  const smallTextMark = schema.marks.wikiSmallText;
  if (!smallTextMark) throw new Error("No wikiSmallText mark in the schema");
  return state.doc.rangeHasMark(0, state.doc.content.size, smallTextMark);
};

/** The same renderer the read-only page view uses (WikiPageStaticContent) */
const render = (content: unknown) =>
  renderToHTMLString({
    content: schema.nodeFromJSON(content),
    extensions,
  });

/**
 * Runs the schema's own parse rules against a stub element. Vitest runs
 * without a DOM here, and the block attributes only read getAttribute and
 * the inline style — a real document would just add a dependency for the
 * same coverage.
 */
const parseTextSize = (
  typeName: string,
  attributes: Readonly<Record<string, string>>,
) => {
  const nodeType = schema.nodes[typeName];
  if (!nodeType) throw new Error(`No ${typeName} node in the schema`);
  const rule = nodeType.spec.parseDOM?.find(
    (candidate) => "getAttrs" in candidate && candidate.getAttrs,
  );
  if (!rule?.getAttrs) throw new Error(`No parse rule for ${typeName}`);
  const parsed = rule.getAttrs({
    getAttribute: (name: string) => attributes[name] ?? null,
    style: {},
  } as unknown as HTMLElement);
  if (parsed === false) throw new Error(`Parse rule rejected ${typeName}`);
  // Through create() so a value the rule drops shows up as the schema default
  const { textSize } = nodeType.create(parsed ?? undefined).attrs;
  return textSize as WikiTextSize | null;
};

describe("block-level text size", () => {
  test("renders as a data attribute on paragraphs and lists", () => {
    const html = render(
      doc(
        paragraph("klein", "small"),
        bulletList("small"),
        paragraph("normal"),
      ),
    );

    expect(html).toMatch(/<p [^>]*data-text-size="small"/);
    expect(html).toMatch(/<ul [^>]*data-text-size="small"/);
    // The normal paragraph carries no size at all, not an empty one
    expect(html.match(/data-text-size/g)).toHaveLength(2);
  });

  test("is not rendered for headings, which cannot be small", () => {
    const html = render(
      doc({
        type: "heading",
        attrs: { level: 2, textSize: "small" },
        content: [{ type: "text", text: "Titel" }],
      }),
    );

    expect(html).not.toContain("data-text-size");
  });

  test("survives the JSON round-trip", () => {
    const node = schema.nodeFromJSON(doc(paragraph("klein", "small")));
    node.check();

    const json = node.toJSON() as {
      content: { attrs: { textSize: string | null } }[];
    };
    expect(json.content[0]?.attrs.textSize).toBe("small");
  });

  test("is parsed back from the data attribute", () => {
    expect(parseTextSize("paragraph", { "data-text-size": "small" })).toBe(
      "small",
    );
    expect(parseTextSize("bulletList", { "data-text-size": "small" })).toBe(
      "small",
    );
  });

  test("falls back to the normal size for unknown and missing values", () => {
    expect(parseTextSize("paragraph", { "data-text-size": "huge" })).toBeNull();
    expect(parseTextSize("paragraph", {})).toBeNull();
  });
});

describe("stripWikiSmallTextInSmallBlocks", () => {
  test("removes the inline mark inside a small paragraph", () => {
    const state = stateOf(paragraph("klein", "small", small));

    const transaction = stripWikiSmallTextInSmallBlocks(state);

    expect(transaction).not.toBeNull();
    expect(hasSmallTextMark(state.apply(transaction!))).toBe(false);
  });

  test("removes it anywhere inside a small list", () => {
    const state = stateOf(
      bulletList(
        "small",
        listItem(paragraph("eins", undefined, small)),
        listItem(paragraph("zwei")),
      ),
    );

    const transaction = stripWikiSmallTextInSmallBlocks(state);

    expect(transaction).not.toBeNull();
    expect(hasSmallTextMark(state.apply(transaction!))).toBe(false);
  });

  test("keeps the mark in normal-size blocks", () => {
    const state = stateOf(
      paragraph("markiert", undefined, small),
      paragraph("kleiner Block", "small"),
    );

    expect(stripWikiSmallTextInSmallBlocks(state)).toBeNull();
  });
});

describe("the small-text restriction", () => {
  const restrictionsAt = (state: EditorState, position: number) =>
    getWikiSelectionRestrictions(
      state.apply(
        state.tr.setSelection(TextSelection.create(state.doc, position)),
      ),
    ).smallText;

  test("applies inside a small paragraph", () => {
    const state = stateOf(paragraph("klein", "small"), paragraph("normal"));

    expect(restrictionsAt(state, 2)).toBe(true);
    expect(restrictionsAt(state, 9)).toBe(false);
  });

  test("applies to a normal paragraph inside a small list", () => {
    const state = stateOf(bulletList("small"));

    expect(restrictionsAt(state, 3)).toBe(true);
  });
});
