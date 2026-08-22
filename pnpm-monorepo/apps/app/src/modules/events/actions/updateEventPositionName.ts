"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getLineupPath } from "../utils/eventContainer";
import { buildPositionNameUpdatedAuditEvent } from "../utils/lineupAuditEvents";
import { requireManageablePosition } from "../utils/requireManageablePosition";

const schema = z.object({
  id: z.cuid(),
  name: z.string().trim().max(256),
});

export const updateEventPositionName = createAuthenticatedAction(
  "updateEventPositionName",
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
     * Update position
     */
    await prisma.eventPosition.update({
      where: {
        id: data.id,
      },
      data: {
        name: data.name,
      },
    });

    await createAuditEvents([
      buildPositionNameUpdatedAuditEvent(
        container,
        {
          positionId: position.id,
          previousName: position.name,
          newName: data.name,
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
);
