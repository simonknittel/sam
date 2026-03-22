"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isAllowedToManagePositions } from "../utils/isAllowedToManagePositions";
import { isEventUpdatable } from "../utils/isEventUpdatable";

const schema = z.object({
  positionId: z.cuid(),
  citizenId: z.cuid(),
});

export const updateEventPositionCitizenId = createAuthenticatedAction(
  "updateEventPositionCitizenId",
  schema,
  async (formData, authentication, data, t) => {
    /**
     * Authorize the request
     */
    const position = await prisma.eventPosition.findUnique({
      where: {
        id: data.positionId,
      },
      include: {
        event: {
          include: {
            managers: true,
          },
        },
      },
    });
    if (!position)
      return { error: "Posten nicht gefunden", requestPayload: formData };
    if (!isEventUpdatable(position.event))
      return {
        error: "Das Event ist bereits vorbei.",
        requestPayload: formData,
      };
    if (!(await isAllowedToManagePositions(position.event)))
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    /**
     * Update position
     */
    await prisma.eventPosition.update({
      where: {
        id: data.positionId,
      },
      data: {
        citizen: {
          connect: {
            id: data.citizenId,
          },
        },
      },
    });

    await createAuditEvents([
      {
        type: AuditEventType.EVENT_POSITION_CITIZEN_ASSIGNED,
        data: {
          eventId: position.event.id,
          positionId: position.id,
          citizenId: data.citizenId,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /**
     * Revalidate cache(s)
     */
    revalidatePath(`/app/events/${position.event.id}/lineup`);

    /**
     * Respond with the result
     */
    return {
      success: t("Common.successfullySaved"),
    };
  },
);
