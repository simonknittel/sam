import { Node, mergeAttributes } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import {
  WIKI_WIDE_WIDTH_PX,
  wikiAlignAttribute,
  wikiWidthPxAttribute,
} from "./wikiResizableNodes.js";
import { getWikiSelectionRestrictions } from "./wikiTextOnlyBlocks.js";

export const WIKI_GRID_COLUMN_COUNTS = [2, 3, 4] as const;
export type WikiGridColumnCount = (typeof WIKI_GRID_COLUMN_COUNTS)[number];

export const WIKI_GRID_VERTICAL_ALIGNS = ["center", "stretch"] as const;
export type WikiGridVerticalAlign =
  (typeof WIKI_GRID_VERTICAL_ALIGNS)[number] | null;

/**
 * Content expression for the containers that hold grids next to regular
 * blocks (document, collapsible-section content, callout). The grid is
 * deliberately NOT in the `block` group, so every `block+` container —
 * most importantly the grid cell itself — rejects grids by schema and no
 * insertion path (typing, paste, drag'n'drop) can nest them.
 */
export const WIKI_GRID_HOST_CONTENT = "(block | wikiGrid)+";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    wikiGrid: {
      /** Inserts a grid with the given number of columns */
      insertWikiGrid: (columns: WikiGridColumnCount) => ReturnType;
    };
  }
}

/**
 * A simple grid layout placing content side-by-side. Rendered as a CSS grid
 * that collapses to a single column on small screens (see wikiEditor.css).
 */
export const WikiGrid = Node.create({
  name: "wikiGrid",
  content: "wikiGridCell+",
  isolating: true,

  addAttributes() {
    return {
      // Grids place blocks side by side — they default to the wide preset
      ...wikiWidthPxAttribute(WIKI_WIDE_WIDTH_PX),
      ...wikiAlignAttribute(),
      columns: {
        default: 2,
        parseHTML: (element) => {
          const parsed = Number(element.getAttribute("data-columns"));
          return WIKI_GRID_COLUMN_COUNTS.includes(parsed as WikiGridColumnCount)
            ? parsed
            : 2;
        },
        renderHTML: (attributes) => ({
          "data-columns": String(attributes.columns),
        }),
      },
      /**
       * NULL/"top" aligns cell content to the top (default), "center"
       * centers it vertically, "stretch" grows the last block of each
       * cell so all cells fill to equal height (see wikiEditor.css).
       */
      verticalAlign: {
        default: null,
        parseHTML: (element) => {
          const parsed = element.getAttribute("data-vertical-align");
          return WIKI_GRID_VERTICAL_ALIGNS.includes(
            parsed as Exclude<WikiGridVerticalAlign, null>,
          )
            ? parsed
            : null;
        },
        renderHTML: (attributes) =>
          attributes.verticalAlign
            ? { "data-vertical-align": String(attributes.verticalAlign) }
            : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-wiki-grid]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes({ "data-wiki-grid": "" }, HTMLAttributes),
      0,
    ];
  },

  addCommands() {
    return {
      insertWikiGrid:
        (columns) =>
        ({ state, chain }) => {
          /**
           * The schema only rules out DIRECT nesting — this also covers
           * indirect nesting via a callout or collapsible section inside
           * a grid cell.
           */
          if (getWikiSelectionRestrictions(state).grids) return false;
          return chain()
            .insertContent({
              type: this.name,
              attrs: { columns },
              content: Array.from({ length: columns }, () => ({
                type: "wikiGridCell",
                content: [{ type: "paragraph" }],
              })),
            })
            .command(({ tr, dispatch }) => {
              /**
               * insertContent leaves the cursor in the LAST cell; move it
               * into the first cell instead.
               */
              if (dispatch) {
                const { $from } = tr.selection;
                for (let depth = $from.depth; depth > 0; depth--) {
                  if ($from.node(depth).type.name !== this.name) continue;
                  const firstCellContentStart = $from.before(depth) + 2;
                  tr.setSelection(
                    TextSelection.near(tr.doc.resolve(firstCellContentStart)),
                  );
                  break;
                }
              }
              return true;
            })
            .run();
        },
    };
  },
});

export const WikiGridCell = Node.create({
  name: "wikiGridCell",
  content: "block+",
  isolating: true,

  parseHTML() {
    return [{ tag: "div[data-wiki-grid-cell]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes({ "data-wiki-grid-cell": "" }, HTMLAttributes),
      0,
    ];
  },
});
