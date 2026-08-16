"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { triggerNotifications } from "@/modules/notifications/utils/triggerNotification";
import {
  EventActivityType,
  EventSource,
} from "@sam-monorepo/database/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createEventActivity } from "../utils/eventActivity";
import { isAllowedToManagePositions } from "../utils/isAllowedToManagePositions";
import { isEventUpdatable } from "../utils/isEventUpdatable";

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
      },
      include: {
        managers: true,
      },
    });
    if (!event)
      return { error: "Event nicht gefunden", requestPayload: formData };
    if (!isEventUpdatable(event))
      return {
        error: "Das Event ist bereits vorbei.",
        requestPayload: formData,
      };
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
      if (event.source === EventSource.APP && event.lineupEnabled !== data.value)
        await createEventActivity(transaction, {
          eventId: event.id,
          citizenId: authentication.session.entity?.id ?? null,
          type: EventActivityType.LINEUP_TOGGLED,
          payload: { enabled: data.value },
        });
    });

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
    if (data.value) {
      await triggerNotifications([
        {
          type: "EventLineupEnabled",
          payload: {
            eventId: event.id,
          },
        },
      ]);
    }

    /**
     * Revalidate cache(s)
     */
    revalidatePath(`/app/events/${event.id}/lineup`);

    /**
     * Respond with the result
     */
    return {
      success: t("Common.successfullySaved"),
    };
  },
);
