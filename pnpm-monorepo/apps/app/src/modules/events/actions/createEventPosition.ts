"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isAllowedToManagePositions } from "../utils/isAllowedToManagePositions";
import { isEventUpdatable } from "../utils/isEventUpdatable";

const schema = z.object({
  eventId: z.cuid(),
  name: z.string().trim().max(256),
  description: z.string().trim().max(512).optional(),
  variantIds: z.array(z.cuid()).max(250), // Arbitrary (untested) limit to prevent DDoS
  parentPositionId: z.cuid().optional(),
  fontSize: z.enum(["", "large"]).optional().nullish(),
  backgroundColor: z.string().max(7).optional().nullish(),
  textColor: z.string().max(7).optional().nullish(),
});

export const createEventPosition = createAuthenticatedAction(
  "createEventPosition",
  schema,
  async (formData, authentication, data, t) => {
    /**
     * Authorize the request
     */
    const event = await prisma.event.findUnique({
      where: {
        id: data.eventId,
      },
      include: {
        managers: true,
        positions: true,
      },
    });
    if (!event)
      return { error: "Event nicht gefunden", requestPayload: formData };
    if (!isEventUpdatable(event))
      return {
        error: "Das Event ist bereits vorbei.",
        requestPayload: formData,
      };
    if (!(await isAllowedToManagePositions(event)))
      return { error: t("Common.forbidden"), requestPayload: formData };

    /**
     * Create entry
     */
    const createdPosition = await prisma.eventPosition.create({
      data: {
        event: {
          connect: {
            id: data.eventId,
          },
        },
        name: data.name,
        description: data.description,
        fontSize: data.fontSize,
        backgroundColor: data.backgroundColor,
        textColor: data.textColor,
        order: event.positions.length,
        requiredVariants: {
          createMany: {
            data: data.variantIds.map((id, index) => ({
              variantId: id,
              order: index,
            })),
          },
        },
        ...(data.parentPositionId
          ? {
              parentPosition: {
                connect: {
                  id: data.parentPositionId,
                },
              },
            }
          : {}),
      },
      select: {
        id: true,
      },
    });

    await createAuditEvents([
      {
        type: AuditEventType.EVENT_POSITION_CREATED,
        data: {
          eventId: event.id,
          positionId: createdPosition.id,
          name: data.name,
          variantIds: data.variantIds,
          parentPositionId: data.parentPositionId,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /**
     * Revalidate cache(s)
     */
    revalidatePath(`/app/events/${event.id}/lineup`);

    /**
     * Respond with the result
     */
    return {
      success: t("Common.successfullySaved"),
    };
  },
  {
    parseFormData: (formData) => ({
      eventId: formData.get("eventId"),
      name: formData.get("name"),
      description: formData.has("description")
        ? formData.get("description")
        : undefined,
      variantIds: formData.getAll("variantId[]") || [],
      parentPositionId: formData.has("parentPositionId")
        ? formData.get("parentPositionId")
        : undefined,
      fontSize: formData.has("fontSize") ? formData.get("fontSize") : null,
      backgroundColor: formData.has("backgroundColor")
        ? formData.get("backgroundColor")
        : null,
      textColor: formData.has("textColor") ? formData.get("textColor") : null,
    }),
  },
);
