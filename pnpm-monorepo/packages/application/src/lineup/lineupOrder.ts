import {
  getPositionLevels,
  LINEUP_MAX_DEPTH,
  LINEUP_MAX_POSITIONS,
  LINEUP_MAX_POSITIONS_PER_LEVEL,
  type EventContainerColumns,
} from "@sam-monorepo/domain";
import * as z from "zod";
import type { ApplicationContext } from "../context.js";
import { ConflictError, ValidationError } from "../errors.js";
import { LONG_TRANSACTION_TIMEOUT_IN_MILLISECONDS } from "../eventTemplates/containerContentCopy.js";
import { idSchema } from "../pagination.js";
import { LineupErrorMessage } from "./lineupErrors.js";

/** The largest value of the integer column of the database */
const MAXIMUM_ORDER_VALUE = 2_147_483_647;

export interface LineupOrderNode {
  readonly id: string;
  readonly order?: number | undefined;
  readonly children?: readonly LineupOrderNode[] | undefined;
}

const orderNodeFields = {
  id: idSchema.describe("A position of the lineup (from get_event_lineup)."),
  order: z
    .int()
    .min(0)
    .max(MAXIMUM_ORDER_VALUE)
    .optional()
    .describe(
      "The sort key of the position among its siblings. Without it, the index in the array.",
    ),
};

const orderLevelSchema = <Node extends z.ZodType>(node: Node) =>
  z.array(node).max(LINEUP_MAX_POSITIONS_PER_LEVEL);

/**
 * The lineup has four levels (`LINEUP_MAX_DEPTH`), thus the positions of the
 * fourth level have no children. The schema names the levels instead of a
 * recursive reference.
 */
const fourthLevelNodeSchema = z.strictObject(orderNodeFields);

const createOrderNodeSchema = <Child extends z.ZodType>(child: Child) =>
  z.object({
    ...orderNodeFields,
    children: orderLevelSchema(child).optional(),
  });

const flattenOrder = (
  positions: readonly LineupOrderNode[],
): LineupOrderNode[] =>
  positions.flatMap((position) => [
    position,
    ...flattenOrder(position.children ?? []),
  ]);

/**
 * The nesting sets the parents; the positions that the tree does not name keep
 * their place
 */
export const lineupOrderSchema = orderLevelSchema(
  createOrderNodeSchema(
    createOrderNodeSchema(createOrderNodeSchema(fourthLevelNodeSchema)),
  ),
)
  .refine(
    (positions) => flattenOrder(positions).length <= LINEUP_MAX_POSITIONS,
    {
      message: `The order has more than ${LINEUP_MAX_POSITIONS} positions`,
    },
  )
  // A position under itself would leave the tree
  .refine(
    (positions) => {
      const positionIds = flattenOrder(positions).map(({ id }) => id);
      return new Set(positionIds).size === positionIds.length;
    },
    { message: "The order has a position more than one time" },
  )
  .describe(
    `The full lineup as a tree of at most ${LINEUP_MAX_DEPTH} levels, with at most ${LINEUP_MAX_POSITIONS} positions and at most ${LINEUP_MAX_POSITIONS_PER_LEVEL} positions with the same parent: the top-level positions in their new order, each with its children in their new order. A position of the fourth level has no children.`,
  );

interface OrderUpdate {
  readonly id: string;
  readonly order: number;
  readonly parentPositionId: string | null;
}

const toOrderUpdates = (
  siblings: readonly LineupOrderNode[],
  parentPositionId: string | null,
): OrderUpdate[] =>
  siblings.flatMap((position, index) => [
    { id: position.id, order: position.order ?? index, parentPositionId },
    ...toOrderUpdates(position.children ?? [], position.id),
  ]);

/**
 * Each position of the tree must be in the container: the parents come from
 * the tree, thus no parent goes into a different lineup.
 *
 * @throws ConflictError when a position is not in the container, usually a
 * position that a different tab deleted
 * @throws ValidationError when the new order puts a position below the last
 * level: the positions that the tree does not name keep their parent, thus a
 * moved position takes its children with it
 */
export const writeLineupOrder = async (
  context: ApplicationContext,
  container: EventContainerColumns,
  positions: readonly LineupOrderNode[],
) => {
  await context.prisma.$transaction(
    async (transaction) => {
      const containerPositions = await transaction.eventPosition.findMany({
        where: container,
        select: { id: true },
      });
      const containerPositionIds = new Set(
        containerPositions.map((position) => position.id),
      );
      if (
        flattenOrder(positions).some(
          (position) => !containerPositionIds.has(position.id),
        )
      )
        throw new ConflictError(LineupErrorMessage.LineupChanged);

      for (const update of toOrderUpdates(positions, null))
        await transaction.eventPosition.update({
          where: { id: update.id },
          data: {
            order: update.order,
            parentPositionId: { set: update.parentPositionId },
          },
        });

      const reorderedPositions = await transaction.eventPosition.findMany({
        where: container,
        select: { id: true, parentPositionId: true },
      });
      const levels = getPositionLevels(reorderedPositions);
      if ([...levels.values()].some((level) => level > LINEUP_MAX_DEPTH))
        throw new ValidationError(LineupErrorMessage.LineupTooDeep);
    },
    { timeout: LONG_TRANSACTION_TIMEOUT_IN_MILLISECONDS },
  );
};
