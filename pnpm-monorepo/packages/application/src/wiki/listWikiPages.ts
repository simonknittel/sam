import {
  buildVisibleWikiTree,
  buildWikiPageHref,
  type WikiTreeNode,
} from "@sam-monorepo/wiki-editor/helpers";
import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { NotFoundError } from "../errors.js";
import {
  cursorSchema,
  idSchema,
  pageLimitSchema,
  paginateByCursor,
} from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { loadReadableWikiScope } from "./readableWikiScope.js";
import { WikiErrorMessage } from "./wikiErrors.js";
import { canAddWikiChildren } from "./wikiPagePlacement.js";

export const listWikiPagesInputSchema = z.object({
  event_id: idSchema
    .optional()
    .describe("The briefing of this event instead of the global wiki."),
  parent_id: idSchema.optional().describe("Only the pages below this page."),
  limit: pageLimitSchema,
  cursor: cursorSchema.optional(),
});

export type ListWikiPagesInput = z.output<typeof listWikiPagesInputSchema>;

export interface WikiPageListItem {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly path: string;
  readonly icon_id: string | null;
  /** The parent page in the tree, or null for a page at the top of the tree */
  readonly parent_id: string | null;
  /** 0 for a page at the top of the list */
  readonly depth: number;
  /** The number of readable subpages */
  readonly child_count: number;
  readonly can_add_children: boolean;
}

export interface ListWikiPagesOutput {
  /** The readable pages in the order of the page tree (depth first) */
  readonly pages: WikiPageListItem[];
  readonly next_cursor: string | null;
}

interface FlatWikiTreeNode {
  readonly node: WikiTreeNode;
  readonly parentId: string | null;
  readonly depth: number;
}

const flattenWikiTree = (
  nodes: readonly WikiTreeNode[],
  parentId: string | null,
  depth: number,
): FlatWikiTreeNode[] =>
  nodes.flatMap((node) => [
    { node, parentId, depth },
    ...flattenWikiTree(node.children, node.id, depth + 1),
  ]);

const findWikiTreeNode = (
  nodes: readonly WikiTreeNode[],
  pageId: string,
): WikiTreeNode | null => {
  for (const node of nodes) {
    if (node.id === pageId) return node;

    const descendant = findWikiTreeNode(node.children, pageId);
    if (descendant) return descendant;
  }

  return null;
};

export const listWikiPages = (
  context: ApplicationContext,
  actor: Actor,
  input: ListWikiPagesInput,
): Promise<ListWikiPagesOutput> =>
  withSpan(context, "listWikiPages", async () => {
    const scope = await loadReadableWikiScope(context, actor, input.event_id);
    const tree = buildVisibleWikiTree(scope.pages, scope.permissions);

    let topNodes: readonly WikiTreeNode[] = tree;
    if (input.parent_id !== undefined) {
      const parent = findWikiTreeNode(tree, input.parent_id);
      if (!parent) throw new NotFoundError(WikiErrorMessage.ParentPageNotFound);
      topNodes = parent.children;
    }

    const page = paginateByCursor(
      flattenWikiTree(topNodes, input.parent_id ?? null, 0),
      {
        cursor: input.cursor,
        pageSize: input.limit,
        getCursor: ({ node }) => node.id,
      },
    );

    return {
      pages: page.items.map(({ node, parentId, depth }) => ({
        id: node.id,
        title: node.title,
        slug: node.slug,
        path: buildWikiPageHref(scope.hrefBase, node),
        icon_id: node.iconId,
        parent_id: parentId,
        depth,
        child_count: node.children.length,
        can_add_children: canAddWikiChildren(scope, node.id),
      })),
      next_cursor: page.nextCursor,
    };
  });
