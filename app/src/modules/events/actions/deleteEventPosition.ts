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
  id: z.cuid(),
});

export const deleteEventPosition = createAuthenticatedAction(
  "deleteEventPosition",
  schema,
  async (formData, authentication, data, t) => {
    /**
     * Authorize the request
     */
    const position = await prisma.eventPosition.findUnique({
      where: {
        id: data.id,
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
     * Delete position
     */
    await prisma.eventPosition.delete({
      where: {
        id: data.id,
      },
    });

    await createAuditEvents([
      {
        type: AuditEventType.EVENT_POSITION_DELETED,
        data: {
          eventId: position.event.id,
          positionId: position.id,
          name: position.name,
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
      success: t("Common.successfullyDeleted"),
    };
  },
);
