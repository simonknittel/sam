"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { refresh } from "next/cache";
import * as z from "zod";
import { buildPositionDeletedAuditEvent } from "../utils/lineupAuditEvents";
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
    const { position, container, failure } = await requireManageablePosition(
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

    refresh();

    await createAuditEvents([
      buildPositionDeletedAuditEvent(
        container,
        {
          positionId: position.id,
          name: position.name,
        },
        authentication.session.user.id,
      ),
    ]);

    /**
     * Respond with the result
     */
    return {
      success: t("Common.successfullyDeleted"),
    };
  },
);
