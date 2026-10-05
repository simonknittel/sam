"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { rejectConflict } from "@/modules/actions/utils/rejectConflict";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { refresh } from "next/cache";
import * as z from "zod";
import {
  CLONABLE_POSITION_SELECT,
  clonePositions,
} from "../utils/clonePositions";
import { toEventContainer } from "../utils/eventContainer";
import { canSeeEvent } from "../utils/eventVisibility";
import { isAllowedToManagePositions } from "../utils/isAllowedToManagePositions";
import { isEventUpdatable } from "../utils/isEventUpdatable";
import { buildPositionTree } from "../utils/positionTree";

const schema = z.object({
  targetEventId: z.cuid(),
  sourceEventId: z.cuid(),
});

export const copyLineupFromEvent = createAuthenticatedAction(
  "copyLineupFromEvent",
  schema,
  async (formData, authentication, data, t) => {
    /**
     * Authorize the request
     */
    if (!authentication.session.entity)
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    /**
     * Validate request data and authorization
     */
    const [targetEvent, sourceEvent] = await prisma.$transaction([
      prisma.event.findUnique({
        where: { id: data.targetEventId, deletedAt: null },
        select: {
          id: true,
          startTime: true,
          endTime: true,
          discordCreatorId: true,
          createdById: true,
          managers: {
            select: {
              id: true,
            },
          },
          positions: {
            where: {
              parentPositionId: null,
            },
            select: {
              id: true,
            },
          },
        },
      }),

      prisma.event.findUnique({
        where: { id: data.sourceEventId, deletedAt: null },
        select: {
          id: true,
          lineupEnabled: true,
          discordCreatorId: true,
          createdById: true,
          deletedAt: true,
          visibility: true,
          visibilityRoles: { select: { roleId: true } },
          managers: {
            select: {
              id: true,
            },
          },
        },
      }),
    ]);
    if (!targetEvent) return rejectConflict(t("Common.notFound"), formData);
    /** An event that the caller cannot see gets the answer of an unknown id */
    if (!sourceEvent || !(await canSeeEvent(sourceEvent)))
      return {
        error: t("Common.badRequest"),
        requestPayload: formData,
      };

    if (!isEventUpdatable(targetEvent))
      return rejectConflict("Das Event ist bereits vorbei.", formData);
    if (!(await isAllowedToManagePositions(targetEvent)))
      return { error: t("Common.forbidden"), requestPayload: formData };

    /**
     * The caller must be allowed to view the source lineup (same gate as the
     * lineup page: general event read permission, the visibility of the
     * source event, plus an enabled lineup or position-management rights on
     * the source event).
     */
    if (!(await authentication.authorize("event", "read")))
      return { error: t("Common.forbidden"), requestPayload: formData };
    if (
      !sourceEvent.lineupEnabled &&
      !(await isAllowedToManagePositions(sourceEvent))
    )
      return { error: t("Common.forbidden"), requestPayload: formData };

    /**
     * Mirror positions from source event to target event
     */
    const sourcePositions = await prisma.eventPosition.findMany({
      where: { eventId: sourceEvent.id },
      orderBy: { order: "asc" },
      select: CLONABLE_POSITION_SELECT,
    });

    await prisma.$transaction((transaction) =>
      clonePositions(transaction, buildPositionTree(sourcePositions), {
        container: toEventContainer(targetEvent.id),
        parentPositionId: null,
        startOrder: targetEvent.positions.length,
      }),
    );

    refresh();

    await createAuditEvents([
      {
        type: AuditEventType.EVENT_LINEUP_COPIED,
        data: {
          sourceEventId: sourceEvent.id,
          targetEventId: targetEvent.id,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    return {
      success: t("Common.successfullySaved"),
    };
  },
);
