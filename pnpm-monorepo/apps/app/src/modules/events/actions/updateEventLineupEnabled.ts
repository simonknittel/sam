"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { triggerNotificationsAfterSave } from "@/modules/notifications/utils/triggerNotification";
import { EventActivityType, EventSource } from "@sam-monorepo/database/client";
import { refresh } from "next/cache";
import * as z from "zod";
import { EVENT_MANAGE_GUARD_SELECT } from "../queries/eventManageGuardSelect";
import { createEventActivity } from "../utils/eventActivity";
import { isAllowedToManagePositions } from "../utils/isAllowedToManagePositions";
import { isEventUpdatable } from "../utils/isEventUpdatable";
import { rejectConflict } from "../utils/rejectConflict";

const schema = z.object({
  eventId: z.cuid(),
  value: z.coerce.boolean(),
});

export const updateEventLineupEnabled = createAuthenticatedAction(
  "updateEventLineupEnabled",
  schema,
  async (formData, authentication, data, t) => {
    /**
     * Authorize the request
     */
    const event = await prisma.event.findUnique({
      where: {
        id: data.eventId,
        deletedAt: null,
      },
      select: {
        ...EVENT_MANAGE_GUARD_SELECT,
        source: true,
        lineupEnabled: true,
      },
    });
    if (!event) return rejectConflict("Event nicht gefunden", formData);
    if (!isEventUpdatable(event))
      return rejectConflict("Das Event ist bereits vorbei.", formData);
    if (!(await isAllowedToManagePositions(event)))
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    /**
     * Create entry
     */
    await prisma.$transaction(async (transaction) => {
      await transaction.event.update({
        where: {
          id: data.eventId,
        },
        data: {
          lineupEnabled: data.value,
        },
      });

      /**
       * The activity feed only exists on app events; recorded in both
       * directions, rendered as "published"/"withdrawn".
       */
      if (
        event.source === EventSource.APP &&
        event.lineupEnabled !== data.value
      )
        await createEventActivity(transaction, {
          eventId: event.id,
          citizenId: authentication.session.entity?.id ?? null,
          type: EventActivityType.LINEUP_TOGGLED,
          payload: { enabled: data.value },
        });
    });

    refresh();

    await createAuditEvents([
      {
        type: AuditEventType.EVENT_LINEUP_STATUS_CHANGED,
        data: {
          eventId: event.id,
          enabled: data.value,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /**
     * Trigger notifications
     */
    const areNotificationsSent = data.value
      ? await triggerNotificationsAfterSave([
          {
            type: "EventLineupEnabled",
            payload: {
              eventId: event.id,
            },
          },
        ])
      : true;

    /**
     * Respond with the result
     */
    return {
      success: t("Common.successfullySaved"),
      ...(areNotificationsSent
        ? {}
        : { warning: t("Common.notificationsFailed") }),
    };
  },
);
