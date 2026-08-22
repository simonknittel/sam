"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireManageableEventPosition } from "../utils/requireManageablePosition";

const schema = z.object({
  positionId: z.cuid(),
});

export const resetEventPositionCitizenId = createAuthenticatedAction(
  "resetEventPositionCitizenId",
  schema,
  async (formData, authentication, data, t) => {
    /**
     * Authorize the request
     */
    const { position, eventId, failure } = await requireManageableEventPosition(
      data.positionId,
      formData,
      t,
    );
    if (failure) return failure;

    /**
     * Update position
     */
    await prisma.eventPosition.update({
      where: {
        id: position.id,
      },
      data: {
        citizen: {
          disconnect: true,
        },
      },
    });

    if (position.citizenId) {
      await createAuditEvents([
        {
          type: AuditEventType.EVENT_POSITION_CITIZEN_REMOVED,
          data: {
            eventId,
            positionId: position.id,
            previousCitizenId: position.citizenId,
          },
          createdById: authentication.session.user.id,
        },
      ]);
    }

    /**
     * Revalidate cache(s)
     */
    revalidatePath(`/app/events/${eventId}/lineup`);

    /**
     * Respond with the result
     */
    return {
      success: t("Common.successfullySaved"),
    };
  },
);
