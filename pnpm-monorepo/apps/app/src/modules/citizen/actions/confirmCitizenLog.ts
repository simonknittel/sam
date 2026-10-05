"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { rejectConflict } from "@/modules/actions/utils/rejectConflict";
import {
  AuditEventType,
  type AuditEventDataByType,
} from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { CITIZEN_LOG_GUARD_SELECT } from "@/modules/citizen/queries/citizenLogTableSelect";
import {
  ConfirmationValue,
  toConfirmationStatus,
} from "@/modules/citizen/utils/citizenLogConfirmation";
import { getNoteClassificationAttributes } from "@/modules/citizen/utils/notePermissionAttributes";
import { syncCitizenIdentityAfterLogChange } from "@/modules/citizen/utils/syncCitizenIdentityAfterLogChange";
import {
  isPrismaError,
  PrismaErrorCode,
} from "@/modules/common/utils/isPrismaError";
import { ConfirmationStatus } from "@sam-monorepo/database/client";
import { refresh } from "next/cache";
import * as z from "zod";

const schema = z.object({
  id: z.cuid(),
  /** The action cannot remove a decision, thus "unconfirmed" fails the pipe */
  confirmed: z
    .enum(ConfirmationValue)
    .transform(toConfirmationStatus)
    .pipe(z.enum(ConfirmationStatus)),
});

/** The payload of the system log keeps its texts, it is immutable */
const AUDIT_CONFIRMATION_BY_STATUS = {
  [ConfirmationStatus.CONFIRMED]: "confirmed",
  [ConfirmationStatus.FALSE_REPORT]: "false-report",
} as const satisfies Record<
  ConfirmationStatus,
  AuditEventDataByType[AuditEventType.ENTITY_LOG_CONFIRMED]["confirmed"]
>;

/**
 * Confirms a log or marks it as a false report. A log that has a decision
 * already gets the new decision.
 */
export const confirmCitizenLog = createAuthenticatedAction(
  "confirmCitizenLog",
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
        isAuthorized = await authentication.authorize(
          citizenLog.type,
          "confirm",
        );
        break;

      case "discord-id":
      case "citizen-id":
      case "community-moniker":
        isAuthorized = await authentication.authorize(
          citizenLog.type,
          "create",
        );
        break;

      case "note":
        isAuthorized = await authentication.authorize(
          "note",
          "confirm",
          getNoteClassificationAttributes(citizenLog),
        );
        break;

      /** The other types, for example the Spectrum ID: nobody decides them */
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
        await transaction.citizenLog.update({
          where: { id: citizenLog.id },
          data: {
            confirmed: data.confirmed,
            confirmedAt: new Date(),
            confirmedById: authentication.session.user.id,
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
        type: AuditEventType.ENTITY_LOG_CONFIRMED,
        data: {
          entityId: citizenLog.citizenId,
          logId: citizenLog.id,
          logType: citizenLog.type,
          confirmed: AUDIT_CONFIRMATION_BY_STATUS[data.confirmed],
        },
        createdById: authentication.session.user.id,
      },
    ]);

    return {
      success: t("Common.successfullySaved"),
    };
  },
);
