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

export const createEventPositionApplicationForCurrentUser =
  createAuthenticatedAction(
    "createEventPositionApplicationForCurrentUser",
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

      const participant = await prisma.eventParticipant.findFirst({
        where: {
          eventId: position.event.id,
          cancelledAt: null,
          OR: [
            { discordUserId: authentication.session.discordId },
            { citizenId: authentication.session.entity.id },
          ],
        },
        select: {
          id: true,
        },
      });
      if (!participant)
        return {
          error: "Du bist nicht für dieses Event angemeldet.",
          requestPayload: formData,
        };

      /**
       * Create application
       */
      const createdApplication = await prisma.eventPositionApplication.create({
        data: {
          position: {
            connect: {
              id: data.positionId,
            },
          },
          citizen: {
            connect: {
              id: authentication.session.entity.id,
            },
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
          type: AuditEventType.EVENT_POSITION_APPLICATION_CREATED,
          data: {
            eventId: position.event.id,
            positionId: createdApplication.positionId,
            citizenId: createdApplication.citizenId,
            applicationId: createdApplication.id,
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
        success:
          "Erfolgreich gespeichert. Die Anmeldung muss vom Organisator des Events bestätigt werden.",
      };
    },
  );
