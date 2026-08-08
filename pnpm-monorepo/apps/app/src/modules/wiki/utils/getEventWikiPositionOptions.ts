import {
  buildPositionTree,
  type PositionSubtree,
} from "@/modules/events/utils/positionTree";
import type { EventWikiContextPosition } from "../queries/getEventWikiContext";
import type { WikiPageTargetOption } from "./getWikiPageTargets";

interface PositionInput {
  readonly id: string;
  readonly parentPositionId: string | null;
  readonly name: string;
}

/**
 * The event's lineup positions in depth-first tree order, for the POSITION
 * scope picker — same option shape as the page target selects so
 * `wikiPageOptionLabel` renders the hierarchy.
 */
export const getEventWikiPositionOptions = (
  positions: readonly EventWikiContextPosition[],
): WikiPageTargetOption[] => {
  const tree = buildPositionTree<PositionInput>(
    positions
      .toSorted((a, b) => a.order - b.order)
      .map((position) => ({
        id: position.id,
        parentPositionId: position.parentPositionId,
        name: position.name,
      })),
  );

  const options: WikiPageTargetOption[] = [];
  const walk = (nodes: PositionSubtree<PositionInput>[], depth: number) => {
    for (const node of nodes) {
      options.push({ id: node.id, title: node.name, depth });
      walk(node.childPositions, depth + 1);
    }
  };
  walk(tree, 0);

  return options;
};
