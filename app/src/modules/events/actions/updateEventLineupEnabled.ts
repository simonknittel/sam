"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { triggerNotifications } from "@/modules/notifications/utils/triggerNotification";
import { revalidatePath } from "next/cache";
import { z } from "zod";
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
    await prisma.event.update({
      where: {
        id: data.eventId,
      },
      data: {
        lineupEnabled: data.value,
      },
    });

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
