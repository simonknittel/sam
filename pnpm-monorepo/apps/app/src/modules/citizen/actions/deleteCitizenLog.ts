"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { rejectConflict } from "@/modules/actions/utils/rejectConflict";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { CITIZEN_LOG_GUARD_SELECT } from "@/modules/citizen/queries/citizenLogTableSelect";
import { getNoteClassificationAttributes } from "@/modules/citizen/utils/notePermissionAttributes";
import { syncCitizenIdentityAfterLogChange } from "@/modules/citizen/utils/syncCitizenIdentityAfterLogChange";
import {
  isPrismaError,
  PrismaErrorCode,
} from "@/modules/common/utils/isPrismaError";
import { refresh } from "next/cache";
import * as z from "zod";

const schema = z.object({
  id: z.cuid(),
});

export const deleteCitizenLog = createAuthenticatedAction(
  "deleteCitizenLog",
  schema,
  async (formData, authentication, data, t) => {
    const citizenLog = await prisma.citizenLog.findUnique({
      where: {
        id: data.id,
      },
      select: CITIZEN_LOG_GUARD_SELECT,
    });
    /** A different user deleted the log, and the page must show it */
    if (!citizenLog) return rejectConflict(t("Common.notFound"), formData);

    /**
     * Authorize the request
     */
    let isAuthorized: boolean;
    switch (citizenLog.type) {
      case "handle":
      case "teamspeak-id":
      case "discord-id":
      case "citizen-id":
      case "community-moniker":
        isAuthorized = await authentication.authorize(
          citizenLog.type,
          "delete",
        );
        break;

      case "note":
        isAuthorized = await authentication.authorize(
          "note",
          "delete",
          getNoteClassificationAttributes(citizenLog),
        );
        break;

      /** The other types, for example the Spectrum ID: nobody can delete them */
      default:
        return {
          error: t("Common.badRequest"),
          requestPayload: formData,
        };
    }
    if (!isAuthorized)
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    /** The copies of the confirmed values change in the same transaction */
    try {
      await prisma.$transaction(async (transaction) => {
        await transaction.citizenLog.delete({
          where: {
            id: citizenLog.id,
          },
          select: { id: true },
        });

        await syncCitizenIdentityAfterLogChange(citizenLog, transaction);
      });
    } catch (error) {
      /** A different user deleted the log after the read above */
      if (isPrismaError(error, PrismaErrorCode.RecordNotFound))
        return rejectConflict(t("Common.notFound"), formData);
      throw error;
    }

    refresh();

    await createAuditEvents([
      {
        type: AuditEventType.ENTITY_LOG_DELETED,
        data: {
          entityId: citizenLog.citizenId,
          logId: citizenLog.id,
          logType: citizenLog.type,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    return {
      success: t("Common.successfullyDeleted"),
    };
  },
);
