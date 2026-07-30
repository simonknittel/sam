import { prisma } from "@/db";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { requireAuthenticationApi } from "@/modules/auth/server";
import apiErrorHandler from "@/modules/common/utils/apiErrorHandler";
import getLatestNoteAttributes from "@/modules/common/utils/getLatestNoteAttributes";
import { NextResponse } from "next/server";
import { z } from "zod";
import { updateAlgoliaWithGenericLogType } from "./_lib/updateAlgoliaWithGenericLogType";
import { updateEntityCaches } from "./_lib/updateEntityCaches";

type Params = Promise<{
  id: string;
  logId: string;
}>;

const paramsSchema = z.object({
  id: z.cuid(),
  logId: z.cuid(),
});

const patchBodySchema = z.object({
  noteTypeId: z.string().trim().cuid(),
  classificationLevelId: z.string().trim().cuid(),
});

export async function PATCH(request: Request, props: { params: Params }) {
  try {
    /**
     * Authenticate the request
     */
    const authentication = await requireAuthenticationApi(
      "/api/spynet/citizen/[id]/log/[logId]",
      "PATCH",
    );

    /**
     * Validate the request params and body
     */
    const paramsData = paramsSchema.parse(await props.params);
    const body: unknown = await request.json();
    const data = patchBodySchema.parse(body);

    /**
     * Do the thing
     */
    const entityLog = await prisma.entityLog.findUnique({
      where: {
        id: paramsData.logId,
      },
      include: {
        entity: true,
        attributes: true,
      },
    });

    if (!entityLog) throw new Error("Not found");

    if (entityLog.type !== "note") throw new Error("Bad request");

    const { noteTypeId, classificationLevelId } =
      getLatestNoteAttributes(entityLog);

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

    await authentication.authorizeApi(
      "note",
      "update",
      // @ts-expect-error The authorization types need to get overhauled
      authorizationAttributes,
    );
    await authentication.authorizeApi("note", "create", [
      {
        key: "noteTypeId",
        value: data.noteTypeId,
      },
      {
        key: "classificationLevelId",
        value: data.classificationLevelId,
      },
    ]);

    const item = await prisma.entityLogAttribute.createMany({
      data: [
        {
          entityLogId: paramsData.logId,
          key: "noteTypeId",
          value: data.noteTypeId,
          createdById: authentication.session.user.id,
        },
        {
          entityLogId: paramsData.logId,
          key: "classificationLevelId",
          value: data.classificationLevelId,
          createdById: authentication.session.user.id,
        },
      ],
    });

    await createAuditEvents([
      {
        type: AuditEventType.ENTITY_LOG_UPDATED,
        data: {
          entityId: entityLog.entityId,
          logId: entityLog.id,
          logType: entityLog.type,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /**
     * Respond with the result
     */
    return NextResponse.json(item);
  } catch (error) {
    /**
     * Respond with an error
     */
    return apiErrorHandler(error);
  }
}

export async function DELETE(request: Request, props: { params: Params }) {
  try {
    /**
     * Authenticate and authorize the request
     */
    const authentication = await requireAuthenticationApi(
      "/api/spynet/citizen/[id]/log/[logId]",
      "DELETE",
    );

    /**
     * Validate the request params
     */
    const paramsData = paramsSchema.parse(await props.params);

    /**
     * Do the thing
     */
    const entityLog = await prisma.entityLog.findFirst({
      where: {
        id: paramsData.logId,
      },
      include: {
        entity: true,
        attributes: true,
      },
    });

    if (!entityLog) throw new Error("Not found");

    switch (entityLog.type) {
      case "handle":
      case "teamspeak-id":
      case "discord-id":
      case "citizen-id":
      case "community-moniker":
        await authentication.authorizeApi(entityLog.type, "delete");
        break;

      case "note":
        const { noteTypeId, classificationLevelId } =
          getLatestNoteAttributes(entityLog);

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

        await authentication.authorizeApi(
          "note",
          "delete",
          // @ts-expect-error The authorization types need to get overhauled
          authorizationAttributes,
        );
        break;

      default:
        throw new Error("Bad request");
    }

    await prisma.entityLog.delete({
      where: {
        id: paramsData.logId,
      },
    });

    await createAuditEvents([
      {
        type: AuditEventType.ENTITY_LOG_DELETED,
        data: {
          entityId: entityLog.entityId,
          logId: entityLog.id,
          logType: entityLog.type,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /**
     * Update name field of user corresponding use entry
     */
    if (["handle", "discord-id"].includes(entityLog.type)) {
      const entityLogs = await prisma.entityLog.findMany({
        where: {
          entityId: entityLog.entityId,
          type: {
            in: ["discord-id", "handle"],
          },
          attributes: {
            some: {
              key: "confirmed",
              value: "confirmed",
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const latestConfirmedHandleLog = entityLogs.find(
        (log) => log.type === "handle",
      );
      const latestConfirmedDiscordIdLog = entityLogs.find(
        (log) => log.type === "discord-id",
      );

      if (latestConfirmedDiscordIdLog) {
        const account = await prisma.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: "discord",
              providerAccountId: latestConfirmedDiscordIdLog.content!,
            },
          },
        });

        if (account) {
          await prisma.user.update({
            where: {
              id: account.userId,
            },
            data: {
              name: latestConfirmedHandleLog?.content || entityLog.entityId,
            },
          });
        }
      }
    }

    await updateEntityCaches(entityLog);

    /**
     * Update Algolia
     */
    switch (entityLog.type) {
      case "handle":
        await updateAlgoliaWithGenericLogType(entityLog, "handles");
        break;
      case "citizen-id":
        await updateAlgoliaWithGenericLogType(entityLog, "citizenIds");
        break;
      case "community-moniker":
        await updateAlgoliaWithGenericLogType(entityLog, "communityMonikers");
        break;

      default:
        break;
    }

    /**
     * Respond with the result
     */
    return NextResponse.json({});
  } catch (error) {
    /**
     * Respond with an error
     */
    return apiErrorHandler(error);
  }
}
