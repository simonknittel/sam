"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { triggerNotifications } from "@/modules/notifications/utils/triggerNotification";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
  citizenId: z.cuid(),
  points: z.coerce.number().int().min(1),
  reason: z.string().trim().max(512).optional(),
  expiresAt: z.coerce.date().optional(),
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
    await triggerNotifications([
      {
        type: "PenaltyEntryCreated",
        payload: {
          penaltyEntryId: createdEntry.id,
        },
      },
    ]);

    /**
     * Revalidate cache(s)
     */
    revalidatePath(
      `/app/spynet/citizen/${createdEntry.citizenId}/penalty-points`,
    );
    revalidatePath("/app/penalty-points");

    /**
     * Respond with the result
     */
    return {
      success: "Erfolgreich gespeichert.",
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
