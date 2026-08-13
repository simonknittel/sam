"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireManageablePosition } from "../utils/requireManageablePosition";

const schema = z.object({
  id: z.cuid(),
});

export const deleteEventPosition = createAuthenticatedAction(
  "deleteEventPosition",
  schema,
  async (formData, authentication, data, t) => {
    /**
     * Authorize the request
     */
    const { position, failure } = await requireManageablePosition(
      data.id,
      formData,
      t,
    );
    if (failure) return failure;

    /**
     * Delete position
     */
    await prisma.eventPosition.delete({
      where: {
        id: data.id,
      },
    });

    await createAuditEvents([
      {
        type: AuditEventType.EVENT_POSITION_DELETED,
        data: {
          eventId: position.event.id,
          positionId: position.id,
          name: position.name,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /**
     * Revalidate cache(s)
     */
    revalidatePath(`/app/events/${position.event.id}/lineup`);

    /**
     * Respond with the result
     */
    return {
      success: t("Common.successfullyDeleted"),
    };
  },
);
