import type { EventPosition, Prisma } from "@sam-monorepo/database/client";
import { eventContainerColumns, type EventContainer } from "./eventContainer";

/**
 * Loads exactly the columns a clone carries over, plus the id and parent the
 * caller needs to rebuild the tree. It lives next to `ClonablePosition` so a
 * new clonable column is added in one place instead of once per copy action.
 */
export const CLONABLE_POSITION_SELECT = {
  id: true,
  parentPositionId: true,
  name: true,
  description: true,
  fontSize: true,
  backgroundColor: true,
  textColor: true,
  requiredRoles: { select: { id: true } },
  requiredVariants: {
    select: { variantId: true, order: true },
    orderBy: { order: "asc" },
  },
} as const satisfies Prisma.EventPositionSelect;

interface ClonablePosition {
  id: EventPosition["id"];
  name: EventPosition["name"];
  description: EventPosition["description"];
  fontSize: EventPosition["fontSize"];
  backgroundColor: EventPosition["backgroundColor"];
  textColor: EventPosition["textColor"];
  requiredRoles: { id: string }[];
  requiredVariants: { variantId: string; order: number }[];
  childPositions: ClonablePosition[];
}

interface Target {
  container: EventContainer;
  parentPositionId: EventPosition["parentPositionId"];
  /**
   * `order` of the first cloned position. The following positions of the same
   * level continue from there.
   */
  startOrder: number;
}

/**
 * Recreates the given positions including their child positions in the target
 * container. Assigned citizens and applications are intentionally left behind
 * since a copy is meant to start out unassigned — and a template blueprint
 * never has either.
 *
 * @returns The new position id of every source position, keyed by source id.
 *   Callers that copy a briefing alongside the lineup need it to remap the
 *   pages' position scopes (see copyWikiPageSubtree).
 */
export const clonePositions = async (
  transaction: Prisma.TransactionClient,
  positions: ClonablePosition[],
  target: Target,
  /** Filled in by the recursion; callers pass nothing */
  newIdBySourceId = new Map<string, string>(),
): Promise<Map<string, string>> => {
  for (const [index, position] of positions.entries()) {
    const createdPosition = await transaction.eventPosition.create({
      data: {
        ...eventContainerColumns(target.container),
        parentPositionId: target.parentPositionId,
        name: position.name,
        description: position.description,
        fontSize: position.fontSize,
        backgroundColor: position.backgroundColor,
        textColor: position.textColor,
        order: target.startOrder + index,
        ...(position.requiredRoles.length > 0
          ? {
              requiredRoles: {
                connect: position.requiredRoles.map(({ id }) => ({ id })),
              },
            }
          : {}),
        ...(position.requiredVariants.length > 0
          ? {
              requiredVariants: {
                createMany: {
                  data: position.requiredVariants.map(
                    ({ variantId, order }) => ({
                      variantId,
                      order,
                    }),
                  ),
                },
              },
            }
          : {}),
      },
      select: {
        id: true,
      },
    });

    newIdBySourceId.set(position.id, createdPosition.id);

    if (position.childPositions.length > 0) {
      await clonePositions(
        transaction,
        position.childPositions,
        {
          container: target.container,
          parentPositionId: createdPosition.id,
          startOrder: 0,
        },
        newIdBySourceId,
      );
    }
  }

  return newIdBySourceId;
};
