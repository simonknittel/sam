import type { EventPosition } from "@sam-monorepo/database/browser";

/**
 * The lineup is limited to four levels in three independent places: the nested
 * `childPositions` of `getEventById()`, the schema of
 * `updateEventLineupOrder()` and the `groupLevel` check of `<Position />`.
 * Exceeding it hides the deepest positions from the page and makes reordering
 * the lineup fail validation.
 */
export const MAX_LINEUP_DEPTH = 4;

/**
 * `updateEventLineupOrder()` refuses to reorder a lineup which has more
 * positions than this on a single level.
 */
export const MAX_POSITIONS_PER_LEVEL = 50;

interface PositionNode {
  childPositions?: PositionNode[];
}

/**
 * Number of levels a position occupies including its descendants. A position
 * without child positions has a depth of 1.
 */
export const getSubtreeDepth = (position: PositionNode): number => {
  if (!position.childPositions || position.childPositions.length <= 0) return 1;

  return (
    1 +
    Math.max(...position.childPositions.map((child) => getSubtreeDepth(child)))
  );
};

/**
 * Number of positions a position consists of including its descendants.
 */
export const getSubtreeSize = (position: PositionNode): number => {
  if (!position.childPositions) return 1;

  return position.childPositions.reduce(
    (total, child) => total + getSubtreeSize(child),
    1,
  );
};

/**
 * @param parentLevel Level of the position the subtree gets pasted into. `0`
 * when pasting on the top level, `1` when pasting into a top level position,
 * ...
 */
export const canPasteSubtree = (parentLevel: number, subtreeDepth: number) =>
  parentLevel + subtreeDepth <= MAX_LINEUP_DEPTH;

interface FlatPosition {
  id: EventPosition["id"];
  parentPositionId: EventPosition["parentPositionId"];
}

export type PositionSubtree<TPosition> = TPosition & {
  childPositions: PositionSubtree<TPosition>[];
};

const buildNodesById = <TPosition extends FlatPosition>(
  positions: TPosition[],
) => {
  const nodesById = new Map<string, PositionSubtree<TPosition>>(
    positions.map((position) => [
      position.id,
      { ...position, childPositions: [] },
    ]),
  );

  for (const node of nodesById.values()) {
    if (!node.parentPositionId) continue;
    nodesById.get(node.parentPositionId)?.childPositions.push(node);
  }

  return nodesById;
};

/**
 * Turns a flat list of positions into the nested structure the lineup is
 * rendered and stored as. Child positions keep the order of the given list.
 */
export const buildPositionTree = <TPosition extends FlatPosition>(
  positions: TPosition[],
): PositionSubtree<TPosition>[] => {
  const nodesById = buildNodesById(positions);

  return positions
    .filter((position) => !position.parentPositionId)
    .map((position) => nodesById.get(position.id))
    .filter((node) => node !== undefined);
};

/**
 * @returns The given position including all of its descendants or `null` if
 * the position isn't part of the given list.
 */
export const getPositionSubtree = <TPosition extends FlatPosition>(
  positions: TPosition[],
  positionId: EventPosition["id"],
): PositionSubtree<TPosition> | null =>
  buildNodesById(positions).get(positionId) ?? null;

/**
 * @returns `1` for a top level position, `2` for its child positions, ...
 */
export const getPositionLevel = (
  positions: FlatPosition[],
  positionId: EventPosition["id"],
): number => {
  const parentPositionIds = new Map(
    positions.map((position) => [position.id, position.parentPositionId]),
  );

  const visitedPositionIds = new Set<string>([positionId]);
  let level = 1;
  let parentPositionId = parentPositionIds.get(positionId);

  // The `visitedPositionIds` check keeps a corrupted lineup from looping forever
  while (parentPositionId && !visitedPositionIds.has(parentPositionId)) {
    visitedPositionIds.add(parentPositionId);
    level += 1;
    parentPositionId = parentPositionIds.get(parentPositionId);
  }

  return level;
};
