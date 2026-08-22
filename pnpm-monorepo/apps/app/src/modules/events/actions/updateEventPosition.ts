"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getLineupPath } from "../utils/eventContainer";
import { buildPositionUpdatedAuditEvent } from "../utils/lineupAuditEvents";
import { requireManageablePosition } from "../utils/requireManageablePosition";

const schema = z.object({
  positionId: z.cuid(),
  name: z.string().trim().max(256),
  description: z.string().trim().max(512).optional(),
  variantIds: z.array(z.cuid()).max(250), // Arbitrary (untested) limit to prevent DDoS
  fontSize: z.enum(["", "large"]).optional().nullable(),
  backgroundColor: z.string().max(7).optional().nullable(),
  textColor: z.string().max(7).optional().nullable(),
});

export const updateEventPosition = createAuthenticatedAction(
  "updateEventPosition",
  schema,
  async (formData, authentication, data, t) => {
    /**
     * Authorize the request
     */
    const { position, container, failure } = await requireManageablePosition(
      data.positionId,
      formData,
      t,
    );
    if (failure) return failure;

    /**
     * Update position
     */
    await prisma.$transaction([
      prisma.eventPositionRequiredVariant.deleteMany({
        where: {
          positionId: position.id,
        },
      }),

      prisma.eventPosition.update({
        where: {
          id: data.positionId,
        },
        data: {
          name: data.name,
          description: data.description,
          fontSize: data.fontSize,
          backgroundColor: data.backgroundColor,
          textColor: data.textColor,
          requiredVariants: {
            createMany: {
              data: data.variantIds.map((id, index) => ({
                variantId: id,
                order: index,
              })),
            },
          },
        },
      }),
    ]);

    await createAuditEvents([
      buildPositionUpdatedAuditEvent(
        container,
        {
          positionId: position.id,
          previousName: position.name,
          newName: data.name,
          previousFontSize: position.fontSize || null,
          newFontSize: data.fontSize || null,
          previousBackgroundColor: position.backgroundColor || null,
          newBackgroundColor: data.backgroundColor || null,
          previousTextColor: position.textColor || null,
          newTextColor: data.textColor || null,
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
      success: "Erfolgreich gespeichert.",
    };
  },
  {
    parseFormData: (formData) => ({
      positionId: formData.get("positionId"),
      name: formData.get("name"),
      description: formData.has("description")
        ? formData.get("description")
        : undefined,
      variantIds: formData.getAll("variantId[]") || [],
      fontSize: formData.has("fontSize") ? formData.get("fontSize") : null,
      backgroundColor: formData.has("backgroundColor")
        ? formData.get("backgroundColor")
        : null,
      textColor: formData.has("textColor") ? formData.get("textColor") : null,
    }),
  },
);
