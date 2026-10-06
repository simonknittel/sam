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
import { lockCitizen } from "@/modules/citizen/utils/lockCitizen";
import { getNotePermissionAttributes } from "@/modules/citizen/utils/notePermissionAttributes";
import { syncCitizenIdentityAfterLogChange } from "@/modules/citizen/utils/syncCitizenIdentityAfterLogChange";
import { ConfirmationStatus, type Prisma } from "@sam-monorepo/database/client";
import { ACTIVE_CITIZEN_WHERE } from "@sam-monorepo/domain";
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

const ALREADY_DECIDED_ERROR = "Über diesen Eintrag wurde bereits entschieden.";

const OWN_DISCORD_ID_ERROR =
  "Du kannst deine eigene Discord ID nicht bestätigen. Das muss eine andere Person tun.";

/**
 * Confirms a log or marks it as a false report. Only a log without a decision
 * gets one: the UI never offers a change of a decision. The logs of a deleted
 * citizen are read only.
 */
export const confirmCitizenLog = createAuthenticatedAction(
  "confirmCitizenLog",
  schema,
  async (formData, authentication, data, t) => {
    const citizenLog = await prisma.citizenLog.findFirst({
      where: {
        id: data.id,
        citizen: ACTIVE_CITIZEN_WHERE,
      },
      select: { ...CITIZEN_LOG_GUARD_SELECT, confirmed: true, content: true },
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
          "confirm",
        );
        break;

      case "note":
        isAuthorized = await authentication.authorize(
          "note",
          "confirm",
          getNotePermissionAttributes(citizenLog),
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

    /**
     * A confirmed Discord ID links the citizen to the login of the Discord
     * account. A user who confirms their own Discord ID could thus move
     * their login to a different citizen and get its roles.
     */
    if (
      citizenLog.type === "discord-id" &&
      data.confirmed === ConfirmationStatus.CONFIRMED &&
      citizenLog.content &&
      (await prisma.account.count({
        where: {
          provider: "discord",
          providerAccountId: citizenLog.content,
          userId: authentication.session.user.id,
        },
      })) > 0
    )
      return {
        error: OWN_DISCORD_ID_ERROR,
        requestPayload: formData,
      };

    /**
     * The log as the permission check saw it. A different user who moves the
     * note or deletes the log or its citizen after the check makes the write
     * fail.
     */
    const checkedLogWhere = {
      id: citizenLog.id,
      noteTypeId: citizenLog.noteTypeId,
      classificationLevelId: citizenLog.classificationLevelId,
      citizen: ACTIVE_CITIZEN_WHERE,
    } satisfies Prisma.CitizenLogWhereInput;

    const isUpdated = await prisma.$transaction(async (transaction) => {
      await lockCitizen(transaction, citizenLog.citizenId);

      const { count } = await transaction.citizenLog.updateMany({
        where: { ...checkedLogWhere, confirmed: null },
        data: {
          confirmed: data.confirmed,
          confirmedAt: new Date(),
          confirmedById: authentication.session.user.id,
        },
      });
      if (count === 0) return false;

      /** The copies of the confirmed values change in the same transaction */
      await syncCitizenIdentityAfterLogChange(citizenLog, transaction);
      return true;
    });

    if (!isUpdated) {
      /**
       * A different user or tab changed the log after the page loaded, and
       * the page must show it. Only an unchanged log has a decision now.
       */
      const isAlreadyDecided =
        (await prisma.citizenLog.count({ where: checkedLogWhere })) > 0;
      return rejectConflict(
        isAlreadyDecided ? ALREADY_DECIDED_ERROR : t("Common.notFound"),
        formData,
      );
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
