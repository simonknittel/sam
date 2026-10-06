"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { rejectConflict } from "@/modules/actions/utils/rejectConflict";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { CITIZEN_LOG_GUARD_SELECT } from "@/modules/citizen/queries/citizenLogTableSelect";
import { lockCitizen } from "@/modules/citizen/utils/lockCitizen";
import { getNotePermissionAttributes } from "@/modules/citizen/utils/notePermissionAttributes";
import { syncCitizenIdentityAfterLogChange } from "@/modules/citizen/utils/syncCitizenIdentityAfterLogChange";
import { ACTIVE_CITIZEN_WHERE } from "@sam-monorepo/domain";
import { refresh } from "next/cache";
import * as z from "zod";

const schema = z.object({
  id: z.cuid(),
});

/** The logs of a deleted citizen are read only */
export const deleteCitizenLog = createAuthenticatedAction(
  "deleteCitizenLog",
  schema,
  async (formData, authentication, data, t) => {
    const citizenLog = await prisma.citizenLog.findFirst({
      where: {
        id: data.id,
        citizen: ACTIVE_CITIZEN_WHERE,
      },
      select: { ...CITIZEN_LOG_GUARD_SELECT, confirmed: true },
    });
    /**
     * A different user deleted the log or its citizen, and the page must
     * show it
     */
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
          getNotePermissionAttributes(citizenLog),
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

    const isDeleted = await prisma.$transaction(async (transaction) => {
      await lockCitizen(transaction, citizenLog.citizenId);

      /**
       * The log as the permission check saw it. A different user who moves
       * the note, decides about the log or deletes the log or its citizen
       * after the check makes the delete fail.
       */
      const { count } = await transaction.citizenLog.deleteMany({
        where: {
          id: citizenLog.id,
          noteTypeId: citizenLog.noteTypeId,
          classificationLevelId: citizenLog.classificationLevelId,
          confirmed: citizenLog.confirmed,
          citizen: ACTIVE_CITIZEN_WHERE,
        },
      });
      if (count === 0) return false;

      /** The copies of the confirmed values change in the same transaction */
      await syncCitizenIdentityAfterLogChange(citizenLog, transaction);
      return true;
    });
    /** The page must show the change of the different user */
    if (!isDeleted) return rejectConflict(t("Common.notFound"), formData);

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
