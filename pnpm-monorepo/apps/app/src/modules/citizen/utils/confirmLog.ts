import { prisma } from "@/db";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { requireAuthentication } from "@/modules/auth/server";
import getLatestNoteAttributes from "@/modules/citizen/utils/getLatestNoteAttributes";
import type {
  EntityLog,
  EntityLogAttribute,
} from "@sam-monorepo/database/client";
import { syncCitizenIdentityAfterLogChange } from "./syncCitizenIdentityAfterLogChange";

export const confirmLog = async (
  log: EntityLog & {
    attributes: EntityLogAttribute[];
  },
  value: "confirmed" | "false-report",
) => {
  const authentication = await requireAuthentication();

  switch (log.type) {
    case "handle":
    case "teamspeak-id":
      await authentication.authorize(log.type, "confirm");
      break;
    case "discord-id":
    case "citizen-id":
    case "community-moniker":
      await authentication.authorize(log.type, "create");
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

      await authentication.authorize(
        "note",
        "confirm",
        // @ts-expect-error The authorization types need to get overhauled
        authorizationAttributes,
      );
      break;

    default:
      throw new Error("Bad request");
  }

  const confirmedAttribute = await prisma.entityLogAttribute.create({
    data: {
      entityLog: {
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
        entityId: log.entityId,
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
