import { Extension } from "@tiptap/core";
import { Blockquote } from "@tiptap/extension-blockquote";
import { Heading } from "@tiptap/extension-heading";
import { ListItem, TaskItem } from "@tiptap/extension-list";
import { TableCell, TableHeader } from "@tiptap/extension-table";
import { TextAlign } from "@tiptap/extension-text-align";
import type { Node as ProseMirrorNode, ResolvedPos } from "@tiptap/pm/model";
import {
  Plugin,
  PluginKey,
  type EditorState,
  type Transaction,
} from "@tiptap/pm/state";

/**
 * Containers whose children are restricted to plain-text paragraphs (list
 * items additionally allow nested lists). Enforced by the content
 * expressions below, so no insertion path — typing, commands, paste,
 * drag'n'drop — can put other blocks inside. Marks and inline nodes stay
 * available in the paragraphs; text alignment does not (see
 * WikiTextOnlyBlockGuard).
 */
export const WIKI_TEXT_ONLY_BLOCK_TYPES = [
  "blockquote",
  "tableCell",
  "tableHeader",
  "listItem",
  "taskItem",
] as const;

/** The subset of text-only containers where list toggles still apply */
const LIST_ITEM_TYPES = ["listItem", "taskItem"];

const WIKI_NESTABLE_LISTS = "(bulletList | orderedList | taskList)*";

export const WikiBlockquote = Blockquote.extend({ content: "paragraph+" });

export const WikiTableCell = TableCell.extend({ content: "paragraph+" });

export const WikiTableHeader = TableHeader.extend({ content: "paragraph+" });

export const WikiListItem = ListItem.extend({
  content: `paragraph+ ${WIKI_NESTABLE_LISTS}`,
});

export const WikiTaskItem = TaskItem.extend({
  content: `paragraph+ ${WIKI_NESTABLE_LISTS}`,
});

/**
 * Headings hold plain text only — no page links, mentions or hard breaks
 * (marks like bold/highlight remain available).
 */
export const WikiHeading = Heading.extend({ content: "text*" });

/**
 * What the current selection (or document position) must not do. All
 * flags derive from the schema restrictions above plus the text-only
 * leaves (code block, details summary) and the no-nested-grids rule
 * (wikiGridNodes.ts), so the editor UI can disable or hide exactly the
 * actions that cannot apply.
 */
export interface WikiTextRestrictions {
  /** Block-level actions (headings, quote, table, media, …) unavailable */
  readonly blocks: boolean;
  /** Grid insertion unavailable (grids never nest inside grids) */
  readonly grids: boolean;
  /** List toggles unavailable (inside lists they still switch the type) */
  readonly lists: boolean;
  /** Inline nodes (page links, mentions) unavailable */
  readonly inlineNodes: boolean;
  /** Formatting marks unavailable (code blocks allow no marks) */
  readonly marks: boolean;
  /** Text alignment unavailable */
  readonly alignment: boolean;
  /** Which slash-command entries apply at the caret */
  readonly slashItems: "all" | "noInline" | "textOnly" | "none";
}

const UNRESTRICTED: WikiTextRestrictions = {
  blocks: false,
  grids: false,
  lists: false,
  inlineNodes: false,
  marks: false,
  alignment: false,
  slashItems: "all",
};

/**
 * Restrictions for a single text block (NULL: only its ancestor chain is
 * known, e.g. for an insertion position between blocks)
 */
const restrictionsForTextblock = (
  textblockTypeName: string | null,
  $position: ResolvedPos,
): WikiTextRestrictions => {
  let inTextOnlyContainer = false;
  let inListItem = false;
  let inGridCell = false;
  for (let depth = $position.depth; depth > 0; depth--) {
    const ancestor = $position.node(depth).type.name;
    if ((WIKI_TEXT_ONLY_BLOCK_TYPES as readonly string[]).includes(ancestor))
      inTextOnlyContainer = true;
    if (LIST_ITEM_TYPES.includes(ancestor)) inListItem = true;
    if (ancestor === "wikiGridCell") inGridCell = true;
  }

  const inCodeBlock = textblockTypeName === "codeBlock";
  const inSummary = textblockTypeName === "detailsSummary";
  const inHeading = textblockTypeName === "heading";
  const inLeaf = inCodeBlock || inSummary;

  return {
    blocks: inTextOnlyContainer || inLeaf,
    grids: inTextOnlyContainer || inLeaf || inGridCell,
    lists: (inTextOnlyContainer && !inListItem) || inLeaf,
    inlineNodes: inLeaf || inHeading,
    marks: inCodeBlock,
    alignment: inTextOnlyContainer || inLeaf,
    slashItems: inLeaf
      ? "none"
      : inTextOnlyContainer
        ? "textOnly"
        : inHeading
          ? "noInline"
          : "all",
  };
};

const mergeRestrictions = (
  a: WikiTextRestrictions,
  b: WikiTextRestrictions,
): WikiTextRestrictions => ({
  /** A restriction only applies when it applies to EVERY selected block */
  blocks: a.blocks && b.blocks,
  grids: a.grids && b.grids,
  lists: a.lists && b.lists,
  inlineNodes: a.inlineNodes && b.inlineNodes,
  marks: a.marks && b.marks,
  alignment: a.alignment && b.alignment,
  slashItems: a.slashItems === b.slashItems ? a.slashItems : "all",
});

/**
 * The restrictions applying to the current selection. Selections spanning
 * restricted and unrestricted blocks count as unrestricted — the commands
 * then apply to the unrestricted part while schema and guard keep the
 * restricted part intact.
 */
export const getWikiSelectionRestrictions = (
  state: EditorState,
): WikiTextRestrictions => {
  const { from, to } = state.selection;
  let merged: WikiTextRestrictions | null = null;
  state.doc.nodesBetween(from, to, (node, position) => {
    if (!node.isTextblock) return true;
    const restrictions = restrictionsForTextblock(
      node.type.name,
      state.doc.resolve(position),
    );
    merged = merged ? mergeRestrictions(merged, restrictions) : restrictions;
    return false;
  });
  return merged ?? UNRESTRICTED;
};

/**
 * The restrictions inherited from the ancestors of a document position,
 * e.g. for inserting next to the block at `position` (gutter palette) or
 * for a hovered block (edit menu). Leaf-based restrictions (code block,
 * summary, heading) are not derived — pass the position BEFORE a node,
 * not inside it.
 */
export const getWikiPositionRestrictions = (
  doc: ProseMirrorNode,
  position: number,
): WikiTextRestrictions =>
  restrictionsForTextblock(null, doc.resolve(position));

/**
 * TextAlign with its commands gated to fail where alignment is
 * restricted, so the keyboard shortcuts do nothing there and
 * `editor.can()` reflects the restriction for the toolbar.
 */
export const WikiTextAlign = TextAlign.extend({
  addCommands() {
    const parent = this.parent?.();
    return {
      ...parent,
      setTextAlign:
        (alignment: string) =>
        ({ state, ...rest }) => {
          if (getWikiSelectionRestrictions(state).alignment) return false;
          return parent?.setTextAlign?.(alignment)({ state, ...rest }) ?? false;
        },
      toggleTextAlign:
        (alignment: string) =>
        ({ state, ...rest }) => {
          if (getWikiSelectionRestrictions(state).alignment) return false;
          return (
            parent?.toggleTextAlign?.(alignment)({ state, ...rest }) ?? false
          );
        },
    };
  },
});

/**
 * A transaction resetting the `textAlign` attribute of every paragraph
 * inside a text-only container, or NULL when there is nothing to fix.
 */
export const stripWikiTextOnlyAlignment = (
  state: EditorState,
): Transaction | null => {
  let transaction: Transaction | null = null;
  state.doc.descendants((node, position, parent) => {
    if (!node.isTextblock) return true;
    if (
      node.type.name === "paragraph" &&
      node.attrs.textAlign != null &&
      parent &&
      (WIKI_TEXT_ONLY_BLOCK_TYPES as readonly string[]).includes(
        parent.type.name,
      )
    ) {
      transaction ??= state.tr;
      transaction.setNodeAttribute(position, "textAlign", null);
    }
    return false;
  });
  return transaction;
};

/**
 * The content expressions above keep foreign blocks out of text-only
 * containers, but the shared `textAlign` attribute lives on the paragraph
 * itself and survives schema fitting — this guard strips it again
 * wherever an aligned paragraph lands inside one (paste, drag'n'drop,
 * remote collab edits). Read-only editors never dispatch the fix-up:
 * with collaboration they must not produce document updates.
 */
export const WikiTextOnlyBlockGuard = Extension.create({
  name: "wikiTextOnlyBlockGuard",

  addProseMirrorPlugins() {
    const { editor } = this;

    return [
      new Plugin({
        key: new PluginKey("wikiTextOnlyBlockGuard"),
        appendTransaction: (transactions, _oldState, newState) => {
          if (!editor.isEditable) return null;
          if (!transactions.some((transaction) => transaction.docChanged))
            return null;
          return stripWikiTextOnlyAlignment(newState);
        },
      }),
    ];
  },
});
