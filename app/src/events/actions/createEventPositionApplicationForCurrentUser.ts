"use server";

import { createAuthenticatedAction } from "@/actions/utils/createAction";
import { prisma } from "@/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isEventUpdatable } from "../utils/isEventUpdatable";

const schema = z.object({
  positionId: z.string().cuid(),
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
        include: {
          event: true,
        },
      });
      if (!position)
        return { error: "Posten nicht gefunden", requestPayload: formData };
      if (!isEventUpdatable(position.event))
        return {
          error: "Das Event ist bereits vorbei.",
          requestPayload: formData,
        };

      const participant = await prisma.eventDiscordParticipant.findUnique({
        where: {
          eventId_discordUserId: {
            eventId: position.event.id,
            discordUserId: authentication.session.discordId,
          },
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
        include: {
          position: {
            include: {
              event: true,
            },
          },
        },
      });

      /**
       * Revalidate cache(s)
       */
      revalidatePath(
        `/app/events/${createdApplication.position.event.id}/lineup`,
      );

      /**
       * Respond with the result
       */
      return {
        success:
          "Erfolgreich gespeichert. Die Anmeldung muss vom Organisator des Events bestätigt werden.",
      };
    },
  );
