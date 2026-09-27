import { prisma } from "@/db";
import {
  AuditEventType,
  type AuditEventDataByType,
} from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { requireAuthentication } from "@/modules/auth/server";
import {
  ConfirmationStatus,
  type CitizenLog,
} from "@sam-monorepo/database/client";
import { getNoteClassificationAttributes } from "./notePermissionAttributes";
import { syncCitizenIdentityAfterLogChange } from "./syncCitizenIdentityAfterLogChange";

/** The payload of the system log keeps its texts, it is immutable */
const AUDIT_CONFIRMATION_BY_STATUS = {
  [ConfirmationStatus.CONFIRMED]: "confirmed",
  [ConfirmationStatus.FALSE_REPORT]: "false-report",
} as const satisfies Record<
  ConfirmationStatus,
  AuditEventDataByType[AuditEventType.ENTITY_LOG_CONFIRMED]["confirmed"]
>;

export const confirmLog = async (
  log: Pick<
    CitizenLog,
    "id" | "citizenId" | "type" | "noteTypeId" | "classificationLevelId"
  >,
  confirmed: ConfirmationStatus,
) => {
  const authentication = await requireAuthentication();

  switch (log.type) {
    case "handle":
    case "teamspeak-id":
      if (!(await authentication.authorize(log.type, "confirm")))
        throw new Error("Forbidden");
      break;
    case "discord-id":
    case "citizen-id":
    case "community-moniker":
      if (!(await authentication.authorize(log.type, "create")))
        throw new Error("Forbidden");
      break;
    case "note":
      if (
        !(await authentication.authorize(
          "note",
          "confirm",
          getNoteClassificationAttributes(log),
        ))
      )
        throw new Error("Forbidden");
      break;

    default:
      throw new Error("Bad request");
  }

  /** The copies of the confirmed values change in the same transaction */
  const confirmedLog = await prisma.$transaction(async (transaction) => {
    const updatedLog = await transaction.citizenLog.update({
      where: { id: log.id },
      data: {
        confirmed,
        confirmedAt: new Date(),
        confirmedById: authentication.session.user.id,
      },
      select: { id: true, confirmed: true, confirmedAt: true },
    });

    await syncCitizenIdentityAfterLogChange(log, transaction);

    return updatedLog;
  });

  await createAuditEvents([
    {
      type: AuditEventType.ENTITY_LOG_CONFIRMED,
      data: {
        entityId: log.citizenId,
        logId: log.id,
        logType: log.type,
        confirmed: AUDIT_CONFIRMATION_BY_STATUS[confirmed],
      },
      createdById: authentication.session.user.id,
    },
  ]);

  return confirmedLog;
};
