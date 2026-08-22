"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authorizeEventContainer } from "../utils/authorizeEventContainer";
import { clonePositions } from "../utils/clonePositions";
import {
  eventContainerColumns,
  getLineupPath,
  getPositionContainer,
  type EventContainer,
} from "../utils/eventContainer";
import { buildPositionCopiedAuditEvent } from "../utils/lineupAuditEvents";
import {
  canPasteSubtree,
  getPositionLevel,
  getPositionSubtree,
  getSubtreeDepth,
  MAX_POSITIONS_PER_LEVEL,
} from "../utils/positionTree";

const schema = z.object({
  sourcePositionId: z.cuid(),
  targetPositionId: z.cuid(),
  placement: z.enum(["after", "inside"]),
});

const isSameContainer = (first: EventContainer, second: EventContainer) =>
  first.kind === second.kind && first.id === second.id;

export const pasteEventPosition = createAuthenticatedAction(
  "pasteEventPosition",
  schema,
  async (formData, authentication, data, t) => {
    /**
     * Validate request data
     */
    const [sourcePosition, targetPosition] = await prisma.$transaction([
      prisma.eventPosition.findUnique({
        where: { id: data.sourcePositionId },
        select: {
          id: true,
          name: true,
          eventId: true,
          templateId: true,
        },
      }),

      prisma.eventPosition.findUnique({
        where: { id: data.targetPositionId },
        select: {
          id: true,
          order: true,
          parentPositionId: true,
          eventId: true,
          templateId: true,
        },
      }),
    ]);
    const sourceContainer = sourcePosition
      ? getPositionContainer(sourcePosition)
      : null;
    const targetContainer = targetPosition
      ? getPositionContainer(targetPosition)
      : null;
    if (
      !sourcePosition ||
      !sourceContainer ||
      !targetPosition ||
      !targetContainer
    )
      return {
        error: "Posten nicht gefunden",
        requestPayload: formData,
      };

    /**
     * Authorize the request. Both sides go through the same guard, so a
     * lineup travels between events, between templates and in either
     * direction between the two — which is what makes the clipboard useful.
     * The source doesn't need to be updatable since copying out of an event
     * which is already over is the whole point of pasting it into another.
     */
    const sourceAuthorization = await authorizeEventContainer(
      sourceContainer,
      t,
      { ignoreFreeze: true },
    );
    if (!sourceAuthorization.allowed)
      return { error: sourceAuthorization.error, requestPayload: formData };

    const targetAuthorization = await authorizeEventContainer(
      targetContainer,
      t,
    );
    if (!targetAuthorization.allowed)
      return { error: targetAuthorization.error, requestPayload: formData };

    /**
     * Make sure the paste doesn't break the lineup
     */
    const sourcePositions = await prisma.eventPosition.findMany({
      where: eventContainerColumns(sourceContainer),
      orderBy: { order: "asc" },
      select: {
        id: true,
        parentPositionId: true,
        name: true,
        description: true,
        fontSize: true,
        backgroundColor: true,
        textColor: true,
        requiredRoles: {
          select: {
            id: true,
          },
        },
        requiredVariants: {
          select: {
            variantId: true,
            order: true,
          },
          orderBy: { order: "asc" },
        },
      },
    });

    const subtree = getPositionSubtree(sourcePositions, sourcePosition.id);
    if (!subtree)
      return { error: "Posten nicht gefunden", requestPayload: formData };

    const targetPositions = isSameContainer(sourceContainer, targetContainer)
      ? sourcePositions
      : await prisma.eventPosition.findMany({
          where: eventContainerColumns(targetContainer),
          select: {
            id: true,
            parentPositionId: true,
          },
        });

    const targetLevel = getPositionLevel(targetPositions, targetPosition.id);
    const parentLevel =
      data.placement === "inside" ? targetLevel : targetLevel - 1;
    if (!canPasteSubtree(parentLevel, getSubtreeDepth(subtree)))
      return {
        error: "Der Posten würde zu tief verschachtelt werden.",
        requestPayload: formData,
      };

    const parentPositionId =
      data.placement === "inside"
        ? targetPosition.id
        : targetPosition.parentPositionId;

    const siblings = await prisma.eventPosition.count({
      where: {
        ...eventContainerColumns(targetContainer),
        parentPositionId,
      },
    });
    if (siblings >= MAX_POSITIONS_PER_LEVEL)
      return {
        error: `Auf dieser Ebene sind maximal ${MAX_POSITIONS_PER_LEVEL} Posten möglich.`,
        requestPayload: formData,
      };

    /**
     * Paste the position
     */
    const createdPositions = await prisma.$transaction(async (transaction) => {
      let startOrder: number;

      if (data.placement === "inside") {
        const { _max } = await transaction.eventPosition.aggregate({
          where: {
            ...eventContainerColumns(targetContainer),
            parentPositionId: targetPosition.id,
          },
          _max: { order: true },
        });

        startOrder = (_max.order ?? -1) + 1;
      } else {
        startOrder = targetPosition.order + 1;

        await transaction.eventPosition.updateMany({
          where: {
            ...eventContainerColumns(targetContainer),
            parentPositionId: targetPosition.parentPositionId,
            order: { gte: startOrder },
          },
          data: {
            order: { increment: 1 },
          },
        });
      }

      return await clonePositions(transaction, [subtree], {
        container: targetContainer,
        parentPositionId,
        startOrder,
      });
    });

    await createAuditEvents([
      buildPositionCopiedAuditEvent(
        { container: sourceContainer, positionId: sourcePosition.id },
        { container: targetContainer, positionId: targetPosition.id },
        {
          placement: data.placement,
          positionCount: createdPositions.size,
        },
        authentication.session.user.id,
      ),
    ]);

    /**
     * Revalidate cache(s)
     */
    revalidatePath(getLineupPath(targetContainer));

    /**
     * Respond with the result
     */
    return {
      success: t("Common.successfullySaved"),
    };
  },
);
