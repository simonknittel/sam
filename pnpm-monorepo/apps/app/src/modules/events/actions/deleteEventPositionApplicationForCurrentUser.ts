"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { Prisma } from "@sam-monorepo/database/client";
import { refresh } from "next/cache";
import * as z from "zod";
import { EVENT_FREEZE_WINDOW_SELECT } from "../queries/eventRelationSelects";
import { isEventUpdatable } from "../utils/isEventUpdatable";
import { rejectConflict } from "../utils/rejectConflict";

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

      /**
       * Delete application
       */
      const deletedApplication = await prisma.eventPositionApplication
        .delete({
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
        })
        .catch((error: unknown) => {
          /**
           * A different tab or the end of the participation removed the
           * application before
           */
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2025"
          )
            return null;
          throw error;
        });
      if (!deletedApplication)
        return rejectConflict(
          "Du hast für diesen Posten kein Interesse angemeldet.",
          formData,
        );

      refresh();

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
       * Respond with the result
       */
      return {
        success: t("Common.successfullySaved"),
      };
    },
  );
