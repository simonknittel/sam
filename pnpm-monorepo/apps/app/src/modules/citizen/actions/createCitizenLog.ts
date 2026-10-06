"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { rejectConflict } from "@/modules/actions/utils/rejectConflict";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { lockCitizen } from "@/modules/citizen/utils/lockCitizen";
import {
  isPrismaError,
  PrismaErrorCode,
} from "@/modules/common/utils/isPrismaError";
import type { GenericCitizenLogType } from "@/types";
import { ACTIVE_CITIZEN_WHERE } from "@sam-monorepo/domain";
import { refresh } from "next/cache";
import * as z from "zod";

/**
 * An identity log holds a short value, for example a handle or an ID. The
 * column has no limit, thus the schema sets one.
 */
const IDENTITY_LOG_CONTENT_MAX_LENGTH = 255;

const schema = z.discriminatedUnion("type", [
  z.object({
    citizenId: z.cuid(),
    type: z.enum([
      "handle",
      "teamspeak-id",
      "discord-id",
      "citizen-id",
      "community-moniker",
    ] satisfies GenericCitizenLogType[]),
    content: z.string().trim().min(1).max(IDENTITY_LOG_CONTENT_MAX_LENGTH),
  }),
  z.object({
    citizenId: z.cuid(),
    type: z.literal("note"),
    content: z.string().trim().min(1),
    noteTypeId: z.cuid(),
    classificationLevelId: z.cuid(),
  }),
]);

export const createCitizenLog = createAuthenticatedAction(
  "createCitizenLog",
  schema,
  async (formData, authentication, data, t) => {
    /**
     * Authorize the request
     */
    const isAuthorized =
      data.type === "note"
        ? await authentication.authorize("note", "create", [
            { key: "noteTypeId", value: data.noteTypeId },
            { key: "classificationLevelId", value: data.classificationLevelId },
          ])
        : await authentication.authorize(data.type, "create");
    if (!isAuthorized)
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    let createdLog;
    try {
      createdLog = await prisma.$transaction(async (transaction) => {
        await lockCitizen(transaction, data.citizenId);

        const citizen = await transaction.citizen.findFirst({
          where: {
            id: data.citizenId,
            ...ACTIVE_CITIZEN_WHERE,
          },
          select: {
            id: true,
          },
        });
        if (!citizen) return null;

        return transaction.citizenLog.create({
          data: {
            type: data.type,
            content: data.content,
            submittedBy: {
              connect: {
                id: authentication.session.user.id,
              },
            },
            citizen: {
              connect: {
                id: citizen.id,
              },
            },
            ...(data.type === "note"
              ? {
                  noteType: { connect: { id: data.noteTypeId } },
                  classificationLevel: {
                    connect: { id: data.classificationLevelId },
                  },
                }
              : {}),
          },
          select: {
            id: true,
            type: true,
            citizenId: true,
          },
        });
      });
    } catch (error) {
      /**
       * A different user deleted the note type or the classification level
       * of the note, and the page must show it
       */
      if (isPrismaError(error, PrismaErrorCode.RecordNotFound))
        return rejectConflict(t("Common.notFound"), formData);
      throw error;
    }
    /** A different user deleted the citizen, and the page must show it */
    if (!createdLog) return rejectConflict(t("Common.notFound"), formData);

    refresh();

    await createAuditEvents([
      {
        type: AuditEventType.ENTITY_LOG_CREATED,
        data: {
          entityId: createdLog.citizenId,
          logId: createdLog.id,
          logType: createdLog.type,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    return {
      success: t("Common.successfullySaved"),
    };
  },
);
