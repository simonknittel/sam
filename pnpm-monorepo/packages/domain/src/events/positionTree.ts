import type { EventPosition } from "@sam-monorepo/database/client";
import { LINEUP_MAX_DEPTH } from "./lineupLimits.js";

export enum PastePlacement {
  /** Below the target, on the same level */
  After = "after",
  /** As the last children of the target */
  Inside = "inside",
}

interface PositionNode {
  childPositions?: PositionNode[];
}

export const getSubtreeDepth = (position: PositionNode): number => {
  if (!position.childPositions || position.childPositions.length <= 0) return 1;

  return (
    1 +
    Math.max(...position.childPositions.map((child) => getSubtreeDepth(child)))
  );
};

export const getSubtreeSize = (position: PositionNode): number => {
  if (!position.childPositions) return 1;

  return position.childPositions.reduce(
    (total, child) => total + getSubtreeSize(child),
    1,
  );
};

/**
 * `parentLevel` is 0 on the top level, 1 in a position on the top level, and so
 * on.
 */
export const canPasteSubtree = (parentLevel: number, subtreeDepth: number) =>
  parentLevel + subtreeDepth <= LINEUP_MAX_DEPTH;

interface FlatPosition {
  readonly id: EventPosition["id"];
  readonly parentPositionId: EventPosition["parentPositionId"];
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

/** Child positions keep the order of the given list. */
export const buildPositionTree = <TPosition extends FlatPosition>(
  positions: TPosition[],
): PositionSubtree<TPosition>[] => {
  const nodesById = buildNodesById(positions);

  return positions
    .filter((position) => !position.parentPositionId)
    .map((position) => nodesById.get(position.id))
    .filter((node) => node !== undefined);
};

export const getPositionSubtree = <TPosition extends FlatPosition>(
  positions: TPosition[],
  positionId: EventPosition["id"],
): PositionSubtree<TPosition> | null =>
  buildNodesById(positions).get(positionId) ?? null;

/**
 * 1 for a position on the top level. A position in a cycle gets `Infinity`,
 * thus it is deeper than each limit.
 */
export const getPositionLevels = (
  positions: readonly FlatPosition[],
): Map<string, number> => {
  const parentIds = new Map(
    positions.map((position) => [position.id, position.parentPositionId]),
  );

  return new Map(
    positions.map((position) => {
      const visitedIds = new Set([position.id]);
      let level = 1;
      let parentId = position.parentPositionId;

      while (parentId !== null && parentIds.has(parentId)) {
        if (visitedIds.has(parentId)) return [position.id, Infinity];

        visitedIds.add(parentId);
        level += 1;
        parentId = parentIds.get(parentId) ?? null;
      }

      return [position.id, level];
    }),
  );
};
