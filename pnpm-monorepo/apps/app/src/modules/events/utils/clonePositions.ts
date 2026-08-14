import type {
  Event,
  EventPosition,
  Prisma,
} from "@sam-monorepo/database/client";

interface ClonablePosition {
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
  eventId: Event["id"];
  parentPositionId: EventPosition["parentPositionId"];
  /**
   * `order` of the first cloned position. The following positions of the same
   * level continue from there.
   */
  startOrder: number;
}

/**
 * Recreates the given positions including their child positions. Assigned
 * citizens and applications are intentionally left behind since a copy is
 * meant to start out unassigned.
 *
 * @returns Number of created positions
 */
export const clonePositions = async (
  transaction: Prisma.TransactionClient,
  positions: ClonablePosition[],
  target: Target,
): Promise<number> => {
  let createdPositions = 0;

  for (const [index, position] of positions.entries()) {
    const createdPosition = await transaction.eventPosition.create({
      data: {
        eventId: target.eventId,
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

    createdPositions += 1;

    if (position.childPositions.length > 0) {
      createdPositions += await clonePositions(
        transaction,
        position.childPositions,
        {
          eventId: target.eventId,
          parentPositionId: createdPosition.id,
          startOrder: 0,
        },
      );
    }
  }

  return createdPositions;
};
