import { prisma } from "@/db";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { requireAuthentication } from "@/modules/auth/server";
import getLatestNoteAttributes from "@/modules/citizen/utils/getLatestNoteAttributes";
import type {
  CitizenLog,
  CitizenLogAttribute,
} from "@sam-monorepo/database/client";
import { syncCitizenIdentityAfterLogChange } from "./syncCitizenIdentityAfterLogChange";

export const confirmLog = async (
  log: Pick<CitizenLog, "id" | "citizenId" | "type"> & {
    readonly attributes: readonly Pick<
      CitizenLogAttribute,
      "key" | "value" | "createdAt"
    >[];
  },
  value: "confirmed" | "false-report",
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
      const { noteTypeId, classificationLevelId } =
        getLatestNoteAttributes(log);

      const authorizationAttributes = [];

      if (noteTypeId) {
        authorizationAttributes.push({
          key: "noteTypeId",
          value: noteTypeId.value,
        });
      }

      if (classificationLevelId) {
        authorizationAttributes.push({
          key: "classificationLevelId",
          value: classificationLevelId.value,
        });
      }

      if (
        !(await authentication.authorize(
          "note",
          "confirm",
          // @ts-expect-error The authorization types need to get overhauled
          authorizationAttributes,
        ))
      )
        throw new Error("Forbidden");
      break;

    default:
      throw new Error("Bad request");
  }

  const confirmedAttribute = await prisma.citizenLogAttribute.create({
    data: {
      citizenLog: {
        connect: {
          id: log.id,
        },
      },
      key: "confirmed",
      value,
      createdBy: {
        connect: {
          id: authentication.session.user.id,
        },
      },
    },
  });

  await createAuditEvents([
    {
      type: AuditEventType.ENTITY_LOG_CONFIRMED,
      data: {
        entityId: log.citizenId,
        logId: log.id,
        logType: log.type,
        confirmed: value,
      },
      createdById: authentication.session.user.id,
    },
  ]);

  await syncCitizenIdentityAfterLogChange(log);

  return confirmedAttribute;
};
