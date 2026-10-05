"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { rejectConflict } from "@/modules/actions/utils/rejectConflict";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import {
  isPrismaError,
  PrismaErrorCode,
} from "@/modules/common/utils/isPrismaError";
import { refresh } from "next/cache";
import * as z from "zod";
import { EVENT_FREEZE_WINDOW_SELECT } from "../queries/eventRelationSelects";
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
          event: { deletedAt: null },
        },
        select: {
          id: true,
          event: { select: EVENT_FREEZE_WINDOW_SELECT },
        },
      });
      if (!position?.event)
        return rejectConflict("Posten nicht gefunden", formData);
      if (!isEventUpdatable(position.event))
        return rejectConflict("Das Event ist bereits vorbei.", formData);

      const discordUserId = authentication.session.discordId;
      /**
       * Without a Discord id, `{ discordUserId: null }` would match every app
       * sign-up
       */
      const participant = await prisma.eventParticipant.findFirst({
        where: {
          eventId: position.event.id,
          cancelledAt: null,
          OR: [
            ...(discordUserId ? [{ discordUserId }] : []),
            { citizenId: authentication.session.entity.id },
          ],
        },
        select: {
          id: true,
        },
      });
      /** A different tab or a manager cancelled the participation before */
      if (!participant)
        return rejectConflict(
          "Du bist nicht für dieses Event angemeldet.",
          formData,
        );

      /**
       * Create application
       */
      const createdApplication = await prisma.eventPositionApplication
        .create({
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
        })
        .catch((error: unknown) => {
          /** The unique index found the application of a different tab */
          if (isPrismaError(error, PrismaErrorCode.UniqueConstraintFailed))
            return null;
          throw error;
        });
      if (!createdApplication)
        return rejectConflict(
          "Du hast für diesen Posten bereits Interesse angemeldet.",
          formData,
        );

      refresh();

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
       * Respond with the result
       */
      return {
        success:
          "Erfolgreich gespeichert. Die Anmeldung muss vom Organisator des Events bestätigt werden.",
      };
    },
  );
