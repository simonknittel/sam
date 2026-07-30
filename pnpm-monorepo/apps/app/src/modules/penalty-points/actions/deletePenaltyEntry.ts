"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
  id: z.cuid(),
});

export const deletePenaltyEntry = createAuthenticatedAction(
  "deletePenaltyEntry",
  schema,
  async (formData, authentication, data, t) => {
    if (!(await authentication.authorize("penaltyEntry", "delete")))
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
     * Check if entry is already deleted
     */
    const existingEntry = await prisma.penaltyEntry.findUnique({
      where: { id: data.id },
      select: { deletedAt: true },
    });
    if (existingEntry?.deletedAt)
      return {
        error: t("Common.notFound"),
        requestPayload: formData,
      };

    /**
     * (Soft-)delete entry
     */
    const deletedEntry = await prisma.penaltyEntry.update({
      where: {
        id: data.id,
      },
      data: {
        deletedAt: new Date(),
        deletedBy: {
          connect: {
            id: authentication.session.entity.id,
          },
        },
      },
    });

    await createAuditEvents([
      {
        type: AuditEventType.PENALTY_ENTRY_DELETED,
        data: {
          penaltyEntryId: deletedEntry.id,
          citizenId: deletedEntry.citizenId,
          points: deletedEntry.points,
          reason: deletedEntry.reason,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /**
     * Revalidate cache(s)
     */
    revalidatePath(
      `/app/spynet/citizen/${deletedEntry.citizenId}/penalty-points`,
    );
    revalidatePath("/app/penalty-points");

    /**
     * Respond with the result
     */
    return {
      success: t("Common.successfullyDeleted"),
    };
  },
);
