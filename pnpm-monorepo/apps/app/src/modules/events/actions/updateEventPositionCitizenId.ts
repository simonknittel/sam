"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { ACTIVE_CITIZEN_WHERE } from "@sam-monorepo/domain";
import { revalidatePath } from "next/cache";
import * as z from "zod";
import { requireManageableEventPosition } from "../utils/requireManageablePosition";

const schema = z.object({
  positionId: z.cuid(),
  citizenId: z.cuid(),
});

export const updateEventPositionCitizenId = createAuthenticatedAction(
  "updateEventPositionCitizenId",
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

    const citizen = await prisma.citizen.findFirst({
      where: { id: data.citizenId, ...ACTIVE_CITIZEN_WHERE },
      select: { id: true },
    });
    if (!citizen)
      return { error: "Citizen nicht gefunden", requestPayload: formData };

    /**
     * Update position
     */
    await prisma.eventPosition.update({
      where: {
        id: data.positionId,
      },
      data: {
        citizen: {
          connect: {
            id: data.citizenId,
          },
        },
      },
    });

    await createAuditEvents([
      {
        type: AuditEventType.EVENT_POSITION_CITIZEN_ASSIGNED,
        data: {
          eventId,
          positionId: position.id,
          citizenId: data.citizenId,
        },
        createdById: authentication.session.user.id,
      },
    ]);

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
