"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isEventUpdatable } from "../utils/isEventUpdatable";

const schema = z.object({
  positionId: z.cuid(),
});

export const deleteEventPositionApplicationForCurrentUser =
  createAuthenticatedAction(
    "deleteEventPositionApplicationForCurrentUser",
    schema,
    async (formData, authentication, data, t) => {
      if (!authentication.session.entity)
        return {
          error: t("Common.forbidden"),
          requestPayload: formData,
        };

      const position = await prisma.eventPosition.findUnique({
        where: {
          id: data.positionId,
        },
        select: {
          id: true,
          event: { select: { id: true, startTime: true, endTime: true } },
        },
      });
      if (!position?.event)
        return { error: "Posten nicht gefunden", requestPayload: formData };
      if (!isEventUpdatable(position.event))
        return {
          error: "Das Event ist bereits vorbei.",
          requestPayload: formData,
        };

      /**
       * Delete application
       */
      const deletedApplication = await prisma.eventPositionApplication.delete({
        where: {
          positionId_citizenId: {
            citizenId: authentication.session.entity.id,
            positionId: data.positionId,
          },
        },
        select: {
          id: true,
          positionId: true,
          citizenId: true,
        },
      });

      await createAuditEvents([
        {
          type: AuditEventType.EVENT_POSITION_APPLICATION_DELETED,
          data: {
            eventId: position.event.id,
            positionId: deletedApplication.positionId,
            citizenId: deletedApplication.citizenId,
            applicationId: deletedApplication.id,
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
