"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { rejectConflict } from "@/modules/actions/utils/rejectConflict";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { wallTimeSchema } from "@/modules/common/utils/wallTimeSchema";
import { triggerNotificationsAfterSave } from "@/modules/notifications/utils/triggerNotification";
import { refresh } from "next/cache";
import * as z from "zod";

const schema = z.object({
  citizenId: z.cuid(),
  points: z.coerce.number().int().min(1),
  reason: z.string().trim().max(512).optional(),
  expiresAt: wallTimeSchema.optional(),
});

export const createPenaltyEntry = createAuthenticatedAction(
  "createPenaltyEntry",
  schema,
  async (formData, authentication, data, t) => {
    if (!(await authentication.authorize("penaltyEntry", "create")))
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };
    if (!authentication.session.entity)
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    const citizen = await prisma.citizen.findUnique({
      where: { id: data.citizenId },
      select: { deletedAt: true },
    });
    if (!citizen)
      return {
        error: t("Common.notFound"),
        requestPayload: formData,
      };
    if (citizen.deletedAt) {
      /** A different user deleted the citizen, and the page must show it */
      return rejectConflict("Der Citizen ist gelöscht.", formData);
    }

    /**
     * Create entry
     */
    const createdEntry = await prisma.penaltyEntry.create({
      data: {
        createdBy: {
          connect: {
            id: authentication.session.entity.id,
          },
        },
        citizen: {
          connect: {
            id: data.citizenId,
          },
        },
        points: data.points,
        reason: data.reason,
        expiresAt: data.expiresAt,
      },
      select: {
        id: true,
        citizenId: true,
      },
    });

    refresh();

    await createAuditEvents([
      {
        type: AuditEventType.PENALTY_ENTRY_CREATED,
        data: {
          penaltyEntryId: createdEntry.id,
          citizenId: createdEntry.citizenId,
          points: data.points,
          reason: data.reason || null,
          expiresAt: data.expiresAt || null,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /**
     * Trigger notifications
     */
    const isNotified = await triggerNotificationsAfterSave([
      {
        type: "PenaltyEntryCreated",
        payload: {
          penaltyEntryId: createdEntry.id,
        },
      },
    ]);

    /**
     * Respond with the result
     */
    return {
      success: "Erfolgreich gespeichert.",
      ...(isNotified ? {} : { warning: t("Common.notificationsFailed") }),
    };
  },
  {
    parseFormData: (formData) => ({
      citizenId: formData.get("citizenId"),
      points: formData.get("points"),
      reason: formData.has("reason") ? formData.get("reason") : undefined,
      expiresAt:
        formData.has("expiresAt") && formData.get("expiresAt") !== ""
          ? formData.get("expiresAt")
          : undefined,
    }),
  },
);
