import type { EventPosition, Prisma } from "@sam-monorepo/database/client";
import type { EventContainerColumns } from "@sam-monorepo/domain";
import type { ApplicationContext } from "../context.js";

/**
 * Loads exactly the columns a clone carries over, plus the id and parent the
 * caller needs to rebuild the tree. It lives next to `ClonablePosition` so a
 * new clonable column is added in one place instead of once per copy.
 */
export const CLONABLE_POSITION_SELECT = {
  id: true,
  parentPositionId: true,
  name: true,
  description: true,
  fontSize: true,
  backgroundColor: true,
  textColor: true,
  requiredVariants: {
    select: { variantId: true, order: true },
    orderBy: { order: "asc" },
  },
  requiredRoles: { select: { roleId: true } },
  requiredRoleMatch: true,
} as const satisfies Prisma.EventPositionSelect;

/**
 * The positions of a container that a clone copies, in the order of the
 * lineup. `buildPositionTree()` of the domain makes the tree of them.
 */
export const findClonablePositions = (
  context: Pick<ApplicationContext, "prisma">,
  columns: EventContainerColumns,
) =>
  context.prisma.eventPosition.findMany({
    where: columns,
    orderBy: { order: "asc" },
    select: CLONABLE_POSITION_SELECT,
  });

interface ClonablePosition {
  readonly id: EventPosition["id"];
  readonly name: EventPosition["name"];
  readonly description: EventPosition["description"];
  readonly fontSize: EventPosition["fontSize"];
  readonly backgroundColor: EventPosition["backgroundColor"];
  readonly textColor: EventPosition["textColor"];
  readonly requiredVariants: readonly {
    readonly variantId: string;
    readonly order: number;
  }[];
  readonly requiredRoles: readonly { readonly roleId: string }[];
  readonly requiredRoleMatch: EventPosition["requiredRoleMatch"];
  readonly childPositions: readonly ClonablePosition[];
}

interface CloneTarget {
  readonly columns: EventContainerColumns;
  readonly parentPositionId: EventPosition["parentPositionId"];
  /**
   * `order` of the first cloned position. The following positions of the same
   * level continue from there.
   */
  readonly startOrder: number;
}

/**
 * Recreates the given positions including their child positions in the target
 * container. Assigned citizens and applications are intentionally left behind
 * since a copy is meant to start out unassigned — and a template blueprint
 * never has either.
 *
 * @returns The new position id of every source position, keyed by source id.
 *   Callers that copy a briefing alongside the lineup need it to remap the
 *   pages' position scopes (see `copyWikiPagesIntoContainer`).
 */
export const clonePositions = async (
  transaction: Prisma.TransactionClient,
  positions: readonly ClonablePosition[],
  target: CloneTarget,
  /** Filled in by the recursion; callers pass nothing */
  newIdBySourceId = new Map<string, string>(),
): Promise<Map<string, string>> => {
  for (const [index, position] of positions.entries()) {
    const createdPosition = await transaction.eventPosition.create({
      data: {
        ...target.columns,
        parentPositionId: target.parentPositionId,
        name: position.name,
        description: position.description,
        fontSize: position.fontSize,
        backgroundColor: position.backgroundColor,
        textColor: position.textColor,
        requiredRoleMatch: position.requiredRoleMatch,
        order: target.startOrder + index,
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
        ...(position.requiredRoles.length > 0
          ? {
              requiredRoles: {
                createMany: {
                  data: position.requiredRoles.map(({ roleId }) => ({
                    roleId,
                  })),
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
          columns: target.columns,
          parentPositionId: createdPosition.id,
          startOrder: 0,
        },
        newIdBySourceId,
      );
    }
  }

  return newIdBySourceId;
};
