import type { JSONContent } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

/** A block captured by the edit menus' copy button (WikiDuplicateCopyActions) */
export interface WikiCopiedBlock {
  /** Node JSON — schema-independent, so it survives editor remounts */
  readonly content: JSONContent;
  readonly typeName: string;
  /** For the insert palette's label on copied headings */
  readonly headingLevel: number | null;
  /** Inline nodes (page links, mentions) get wrapped in a paragraph on insert */
  readonly isInline: boolean;
  /** Grids never nest — the palette hides the entry inside grids when true */
  readonly containsGrid: boolean;
}

/**
 * App-wide clipboard slot for the edit menus' copy button, offered for
 * insertion by the gutter's plus palette. Module scope on purpose: it
 * survives page navigation, so blocks copy across wiki pages.
 * Deliberately separate from the OS clipboard — the palette needs
 * structured node JSON, which the OS clipboard can neither guarantee nor
 * expose synchronously (selecting a block and Cmd+C/Cmd+V keeps covering
 * that path natively).
 */
let copiedBlock: WikiCopiedBlock | null = null;

export const setWikiCopiedBlock = (node: ProseMirrorNode) => {
  let containsGrid = node.type.name === "wikiGrid";
  node.descendants((child) => {
    if (child.type.name === "wikiGrid") containsGrid = true;
    return !containsGrid;
  });

  copiedBlock = {
    content: node.toJSON() as JSONContent,
    typeName: node.type.name,
    headingLevel:
      node.type.name === "heading" ? Number(node.attrs.level) : null,
    isInline: node.isInline,
    containsGrid,
  };
};

/**
 * Read at render time of the palette — its popover content mounts on
 * open, so no subscription is needed for freshness.
 */
export const getWikiCopiedBlock = (): WikiCopiedBlock | null => copiedBlock;
