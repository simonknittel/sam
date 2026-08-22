"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authorizeEventContainer } from "../utils/authorizeEventContainer";
import {
  EVENT_CONTAINER_ID_FIELD,
  EVENT_CONTAINER_KIND_FIELD,
  eventContainerColumns,
  EventContainerKind,
  getLineupPath,
  type EventContainer,
} from "../utils/eventContainer";
import { buildPositionCreatedAuditEvent } from "../utils/lineupAuditEvents";

const schema = z.object({
  containerKind: z.enum(EventContainerKind),
  containerId: z.string().min(1).max(64),
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
    const container: EventContainer = {
      kind: data.containerKind,
      id: data.containerId,
    };
    const authorization = await authorizeEventContainer(container, t);
    if (!authorization.allowed)
      return { error: authorization.error, requestPayload: formData };

    /**
     * A parent must live in the same container, or the position would leak
     * into another lineup — the tree is walked by parentPositionId alone.
     */
    if (data.parentPositionId) {
      const parentPosition = await prisma.eventPosition.findFirst({
        where: {
          id: data.parentPositionId,
          ...eventContainerColumns(container),
        },
        select: { id: true },
      });
      if (!parentPosition)
        return { error: t("Common.badRequest"), requestPayload: formData };
    }

    /**
     * Create entry. The order value the lineup always used is the container's
     * total position count, which is at least as large as any sibling's order.
     */
    const positionCount = await prisma.eventPosition.count({
      where: eventContainerColumns(container),
    });

    const createdPosition = await prisma.eventPosition.create({
      data: {
        ...eventContainerColumns(container),
        name: data.name,
        description: data.description,
        fontSize: data.fontSize,
        backgroundColor: data.backgroundColor,
        textColor: data.textColor,
        order: positionCount,
        requiredVariants: {
          createMany: {
            data: data.variantIds.map((id, index) => ({
              variantId: id,
              order: index,
            })),
          },
        },
        parentPositionId: data.parentPositionId ?? null,
      },
      select: {
        id: true,
      },
    });

    await createAuditEvents([
      buildPositionCreatedAuditEvent(
        container,
        {
          positionId: createdPosition.id,
          name: data.name,
          variantIds: data.variantIds,
          parentPositionId: data.parentPositionId,
        },
        authentication.session.user.id,
      ),
    ]);

    /**
     * Revalidate cache(s)
     */
    revalidatePath(getLineupPath(container));

    /**
     * Respond with the result
     */
    return {
      success: t("Common.successfullySaved"),
    };
  },
  {
    parseFormData: (formData) => ({
      containerKind: formData.get(EVENT_CONTAINER_KIND_FIELD),
      containerId: formData.get(EVENT_CONTAINER_ID_FIELD),
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
