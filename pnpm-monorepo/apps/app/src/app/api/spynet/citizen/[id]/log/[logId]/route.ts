import { prisma } from "@/db";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { requireAuthenticationApi } from "@/modules/auth/server";
import { CITIZEN_LOG_GUARD_SELECT } from "@/modules/citizen/queries/citizenLogTableSelect";
import { getNoteClassificationAttributes } from "@/modules/citizen/utils/notePermissionAttributes";
import { syncCitizenIdentityAfterLogChange } from "@/modules/citizen/utils/syncCitizenIdentityAfterLogChange";
import apiErrorHandler from "@/modules/common/utils/apiErrorHandler";
import { NextResponse } from "next/server";
import * as z from "zod";

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
    const citizenLog = await prisma.citizenLog.findUnique({
      where: {
        id: paramsData.logId,
      },
      select: CITIZEN_LOG_GUARD_SELECT,
    });

    if (!citizenLog) throw new Error("Not found");

    if (citizenLog.type !== "note") throw new Error("Bad request");

    await authentication.authorizeApi(
      "note",
      "update",
      getNoteClassificationAttributes(citizenLog),
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

    const item = await prisma.citizenLog.update({
      where: { id: paramsData.logId },
      data: {
        noteTypeId: data.noteTypeId,
        classificationLevelId: data.classificationLevelId,
      },
      select: { id: true },
    });

    await createAuditEvents([
      {
        type: AuditEventType.ENTITY_LOG_UPDATED,
        data: {
          entityId: citizenLog.citizenId,
          logId: citizenLog.id,
          logType: citizenLog.type,
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
    const citizenLog = await prisma.citizenLog.findFirst({
      where: {
        id: paramsData.logId,
      },
      select: CITIZEN_LOG_GUARD_SELECT,
    });

    if (!citizenLog) throw new Error("Not found");

    switch (citizenLog.type) {
      case "handle":
      case "teamspeak-id":
      case "discord-id":
      case "citizen-id":
      case "community-moniker":
        await authentication.authorizeApi(citizenLog.type, "delete");
        break;

      case "note":
        await authentication.authorizeApi(
          "note",
          "delete",
          getNoteClassificationAttributes(citizenLog),
        );
        break;

      default:
        throw new Error("Bad request");
    }

    /** The copies of the confirmed values change in the same transaction */
    await prisma.$transaction(async (transaction) => {
      await transaction.citizenLog.delete({
        where: {
          id: paramsData.logId,
        },
      });

      await syncCitizenIdentityAfterLogChange(citizenLog, transaction);
    });

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
